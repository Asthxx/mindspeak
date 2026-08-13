// 入口：委托给 lib.rs（Tauri 需要 lib crate，main 仅调用）
fn main() {
    mindspeak_lib::run();
}