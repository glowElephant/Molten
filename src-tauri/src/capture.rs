#[cfg(target_os = "windows")]
use windows::Win32::{
    Foundation::{HWND, RECT},
    Graphics::Gdi::{
        CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject,
        GetDC, GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER,
        BI_RGB, DIB_RGB_COLORS,
    },
    UI::WindowsAndMessaging::GetClientRect,
};

/// Capture the Molten window and save as PNG.
/// Uses Win32 BitBlt — works even when window is behind other windows.
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
    use windows::Win32::Graphics::Gdi::BitBlt;
    use windows::Win32::Graphics::Gdi::SRCCOPY;

    let hwnd = window.hwnd().map_err(|e| format!("Failed to get HWND: {}", e))?;
    let hwnd = HWND(hwnd.0);

    unsafe {
        let mut rect = RECT::default();
        GetClientRect(hwnd, &mut rect)
            .map_err(|e| format!("GetClientRect failed: {}", e))?;

        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;

        if width <= 0 || height <= 0 {
            return Err("Window has no size".to_string());
        }

        let hdc_window = GetDC(Some(hwnd));
        let hdc_mem = CreateCompatibleDC(Some(hdc_window));
        let hbitmap = CreateCompatibleBitmap(hdc_window, width, height);

        let old_bitmap = SelectObject(hdc_mem, hbitmap.into());

        // BitBlt captures from the window's DC
        BitBlt(hdc_mem, 0, 0, width, height, Some(hdc_window), 0, 0, SRCCOPY)
            .map_err(|e| format!("BitBlt failed: {}", e))?;

        // Extract pixel data
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // Top-down
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

        // Cleanup GDI
        SelectObject(hdc_mem, old_bitmap);
        let _ = DeleteObject(hbitmap.into());
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(Some(hwnd), hdc_window);

        // Convert BGRA to RGBA
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
