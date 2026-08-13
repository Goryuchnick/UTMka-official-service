// Без этого атрибута рядом с окном в релизе открывается консоль Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    utmka_lib::run();
}
