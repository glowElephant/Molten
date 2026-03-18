#[cfg(target_os = "windows")]
use windows::Win32::{
    Foundation::{HWND, RECT},
    Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject,
        GetDC, GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER,
        BI_RGB, DIB_RGB_COLORS, SRCCOPY,
    },
    UI::WindowsAndMessaging::GetClientRect,
};

#[tauri::command]
pub fn capture_window(window: tauri::Window) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        capture_window_win32(window)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = window;
        Err("Window capture only supported on Windows".to_string())
    }
}

#[cfg(target_os = "windows")]
fn capture_window_win32(window: tauri::Window) -> Result<String, String> {
    use image::{ImageBuffer, Rgba};

    let hwnd = window.hwnd().map_err(|e| format!("Failed to get HWND: {}", e))?;
    let hwnd = HWND(hwnd.0);

    unsafe {
        // Use GetWindowRect instead of GetClientRect to capture full window
        let mut rect = RECT::default();
        GetClientRect(hwnd, &mut rect)
            .map_err(|e| format!("GetClientRect failed: {}", e))?;

        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;

        if width <= 0 || height <= 0 {
            return Err("Window has no size".to_string());
        }

        // Use screen DC instead of window DC for hardware-accelerated content
        let hdc_screen = GetDC(None); // Screen DC
        let hdc_window = GetDC(Some(hwnd));
        let hdc_mem = CreateCompatibleDC(Some(hdc_screen));
        let hbitmap = CreateCompatibleBitmap(hdc_screen, width, height);
        let old_bitmap = SelectObject(hdc_mem, hbitmap.into());

        // Get window position on screen for screen DC capture
        let mut window_rect = RECT::default();
        windows::Win32::UI::WindowsAndMessaging::GetWindowRect(hwnd, &mut window_rect)
            .map_err(|e| format!("GetWindowRect failed: {}", e))?;

        // Try capturing from screen DC (captures composited/GPU content)
        let _ = BitBlt(
            hdc_mem, 0, 0, width, height,
            Some(hdc_screen),
            window_rect.left, window_rect.top,
            SRCCOPY,
        );

        // Extract pixels
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };

        let mut pixels = vec![0u8; (width * height * 4) as usize];

        GetDIBits(
            hdc_mem,
            hbitmap,
            0,
            height as u32,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        SelectObject(hdc_mem, old_bitmap);
        let _ = DeleteObject(hbitmap.into());
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(Some(hwnd), hdc_window);
        ReleaseDC(None, hdc_screen);

        // BGRA → RGBA
        for chunk in pixels.chunks_exact_mut(4) {
            chunk.swap(0, 2);
        }

        let img: ImageBuffer<Rgba<u8>, Vec<u8>> =
            ImageBuffer::from_raw(width as u32, height as u32, pixels)
                .ok_or("Failed to create image buffer")?;

        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("molten-capture.png");
        img.save(&path)
            .map_err(|e| format!("Failed to save PNG: {}", e))?;

        Ok(path.to_string_lossy().to_string())
    }
}
