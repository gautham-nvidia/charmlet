param(
    [Parameter(Mandatory)][ValidateSet('hover', 'click', 'drag')][string]$Action,
    [Parameter(Mandatory)][int]$StartX, [Parameter(Mandatory)][int]$StartY,
    [Parameter(Mandatory)][int]$EndX, [Parameter(Mandatory)][int]$EndY,
    [Parameter(Mandatory)][long]$WindowHandle, [Parameter(Mandatory)][long]$SurfaceHandle,
    [Parameter(Mandatory)][ValidateRange(1, 100000)][int]$CanvasWidth,
    [Parameter(Mandatory)][ValidateRange(1, 100000)][int]$CanvasHeight
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Native pointer checks require the isolated CI desktop.' }
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CharmletNativeInput {
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint x, uint y, uint data, UIntPtr extra);
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr window, ref Point point);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
}
'@
$priorDpi = [CharmletNativeInput]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
try {
    if (([CharmletNativeInput]::GetAsyncKeyState(1) -band 0x8000) -ne 0) { throw 'The mouse is already held.' }
    foreach ($handle in @($WindowHandle, $SurfaceHandle)) {
        if ([CharmletNativeInput]::IsIconic([IntPtr]::new($handle)) -or -not [CharmletNativeInput]::IsWindowVisible([IntPtr]::new($handle))) {
            throw 'An owned test window is hidden or minimized.'
        }
    }
    $box = [CharmletNativeInput+Rect]::new()
    $origin = [CharmletNativeInput+Point]::new()
    $safeBox = [CharmletNativeInput+Rect]::new()
    $safeOrigin = [CharmletNativeInput+Point]::new()
    if (-not [CharmletNativeInput]::GetClientRect([IntPtr]::new($WindowHandle), [ref]$box) -or
        -not [CharmletNativeInput]::ClientToScreen([IntPtr]::new($WindowHandle), [ref]$origin) -or
        -not [CharmletNativeInput]::GetClientRect([IntPtr]::new($SurfaceHandle), [ref]$safeBox) -or
        -not [CharmletNativeInput]::ClientToScreen([IntPtr]::new($SurfaceHandle), [ref]$safeOrigin)) {
        throw 'Native test-window bounds are unavailable.'
    }
    $scaleX = $box.Right / $CanvasWidth
    $scaleY = $box.Bottom / $CanvasHeight
    $StartX = [int]($origin.X + $StartX * $scaleX)
    $StartY = [int]($origin.Y + $StartY * $scaleY)
    $EndX = [int]($origin.X + $EndX * $scaleX)
    $EndY = [int]($origin.Y + $EndY * $scaleY)
    foreach ($point in @([pscustomobject]@{ X = $StartX; Y = $StartY }, [pscustomobject]@{ X = $EndX; Y = $EndY })) {
        if ($point.X -lt $safeOrigin.X -or $point.X -ge ($safeOrigin.X + $safeBox.Right) -or
            $point.Y -lt $safeOrigin.Y -or $point.Y -ge ($safeOrigin.Y + $safeBox.Bottom)) {
            throw "Native input ($($point.X), $($point.Y)) would leave the owned test surface."
        }
    }
    if (-not [CharmletNativeInput]::SetCursorPos($StartX, $StartY)) { throw 'Could not place the test cursor.' }
    Start-Sleep -Milliseconds 350
    if ($Action -ne 'hover') {
        [CharmletNativeInput]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
        try {
            Start-Sleep -Milliseconds 250
            if ($Action -eq 'drag') {
                for ($step = 1; $step -le 20; $step++) {
                    $x = [int]($StartX + ($EndX - $StartX) * $step / 20)
                    $y = [int]($StartY + ($EndY - $StartY) * $step / 20)
                    if (-not [CharmletNativeInput]::SetCursorPos($x, $y)) { throw 'Test cursor movement failed.' }
                    Start-Sleep -Milliseconds 35
                }
            }
        } finally {
            [CharmletNativeInput]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
        }
    }
    [pscustomobject]@{ action = $Action; startX = $StartX; startY = $StartY; endX = $EndX; endY = $EndY; scaleX = $scaleX; scaleY = $scaleY } | ConvertTo-Json -Compress
} finally {
    [void][CharmletNativeInput]::SetThreadDpiAwarenessContext($priorDpi)
}
