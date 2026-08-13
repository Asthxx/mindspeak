// ==================== 闻道 MindSpeak 桌面版核心 ====================
// 启动时拉起内嵌 Node 服务（server.js），窗口指向 localhost:3000，
// 退出时销毁 Node 子进程，保证不残留僵尸进程占用端口。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;

use tauri::Manager;

struct NodeProcess(Mutex<Option<Child>>);

pub fn run() {
    tauri::Builder::default()
        .manage(NodeProcess(Mutex::new(None)))
        .setup(|app| {
            let child = start_node(&app.handle())?;
            if let Some(c) = child {
                *app.state::<NodeProcess>().0.lock().unwrap() = Some(c);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<NodeProcess>();
                if let Ok(mut guard) = state.0.lock() {
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app_handle.state::<NodeProcess>();
                if let Ok(mut guard) = state.0.lock() {
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        });
}

/// 找到随安装包分发到 resources/ 的 node 运行时。
/// 布局:
///   resources/node/node.exe          (Windows)
///   resources/node/node              (macOS/Linux)
///   resources/server/server.js       (内嵌后端 + node_modules)
///   resources/static/**              (dist 前端静态资源)
fn locate_node(resources: &PathBuf) -> Option<PathBuf> {
    let candidates = if cfg!(windows) {
        vec![resources.join("node").join("node.exe")]
    } else {
        vec![resources.join("node").join("node")]
    };
    candidates.into_iter().find(|p| p.is_file())
}

/// 启动内嵌 Node 服务，等待健康检查通过后返回子进程句柄。
fn start_node(app: &tauri::AppHandle) -> Result<Option<Child>, Box<dyn std::error::Error>> {
    let resources = app.path().resource_dir()?;
    let node = locate_node(&resources);
    let server = resources.join("server").join("server.js");
    let static_root = resources.join("static");
    if !server.is_file() || node.is_none() {
        eprintln!("[desktop] 未找到内嵌运行时: node={:?} server={:?}", node, server);
        return Ok(None);
    }
    let node = node.unwrap();

    // 桌面版固定端口 3000；允许环境变量覆盖以便冲突时调试
    let port = std::env::var("MINISPEAK_DESKTOP_PORT").unwrap_or_else(|_| "3000".into());

    // 内嵌版 server 需要知道静态资源根目录，通过环境变量 MINISPEAK_STATIC_ROOT 传给 server.js
    let mut cmd = Command::new(&node);
    if let Some(server_dir) = server.parent() {
        cmd.current_dir(server_dir);
    }
    cmd.args([&server])
        .env("PORT", &port)
        .env("MINISPEAK_STATIC_ROOT", &static_root)
        .env("MINISPEAK_DESKTOP", "1")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn()?;

    // 健康检查：最多等 15s，每 250ms 探测一次
    let url = format!("http://127.0.0.1:{}/api/health", port);
    let mut ready = false;
    for _ in 0..60 {
        std::thread::sleep(Duration::from_millis(250));
        if let Ok(resp) = reqwest_blocking(&url) {
            if resp {
                ready = true;
                break;
            }
        }
    }
    if !ready {
        eprintln!("[desktop] 内嵌服务健康检查未通过: {}", url);
    }
    Ok(Some(child))
}

/// 极简 HTTP GET 健康探测（无第三方依赖）
fn reqwest_blocking(url: &str) -> std::io::Result<bool> {
    use std::io::{Read, Write};
    use std::net::{SocketAddr, ToSocketAddrs, TcpStream};
    let host = match url.strip_prefix("http://") {
        Some(rest) => rest.split('/').next().unwrap_or("127.0.0.1"),
        None => return Ok(false),
    };
    let (h, p) = match host.rsplit_once(':') {
        Some((h, p)) => (h, p.parse::<u16>().unwrap_or(80)),
        None => (host, 80),
    };
    let addr: SocketAddr = (h, p).to_socket_addrs()?.next().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::AddrNotAvailable, "无法解析地址")
    })?;
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(400))?;
    let req = format!(
        "GET /api/health HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
        host
    );
    stream.write_all(req.as_bytes())?;
    stream.flush()?;
    let mut buf = [0u8; 512];
    let n = stream.read(&mut buf)?;
    Ok((
        String::from_utf8_lossy(&buf[..n]).starts_with("HTTP/1.1 200")
            || String::from_utf8_lossy(&buf[..n]).starts_with("HTTP/1.0 200")
    ))
}