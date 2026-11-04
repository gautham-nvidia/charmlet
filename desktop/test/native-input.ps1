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
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class CharmletNativeInput {
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] public struct MouseInput {
        public int X, Y;
        public uint Data, Flags, Time;
        public UIntPtr Extra;
    }
    [StructLayout(LayoutKind.Sequential)] public struct Input { public uint Type; public MouseInput Mouse; }
    [DllImport("user32.dll", SetLastError = true)] private static extern uint SendInput(uint count, Input[] inputs, int size);
    [DllImport("user32.dll")] private static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window, uint flags);
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr window, ref Point point);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
    private static void Inject(MouseInput mouse) {
        var inputs = new[] { new Input { Type = 0, Mouse = mouse } };
        if (SendInput(1, inputs, Marshal.SizeOf(typeof(Input))) != 1) {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Windows rejected native mouse input.");
        }
    }
    public static void MoveCursor(int x, int y) {
        // Inject driver-like movement so low-level mouse hooks also receive it.
        // SetCursorPos alone only repositions the cursor.
        Inject(new MouseInput {
            X = (int)Math.Round((x - GetSystemMetrics(76) + 0.5) * 65536 / GetSystemMetrics(78)),
            Y = (int)Math.Round((y - GetSystemMetrics(77) + 0.5) * 65536 / GetSystemMetrics(79)),
            Flags = 0xC001
        });
    }
    public static void Button(uint flags) { Inject(new MouseInput { Flags = flags }); }
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
    [CharmletNativeInput]::MoveCursor($StartX, $StartY)
    Start-Sleep -Milliseconds 350
    if ($Action -ne 'hover') {
        [CharmletNativeInput]::Button(2)
        try {
            Start-Sleep -Milliseconds 250
            if ($Action -eq 'drag') {
                for ($step = 1; $step -le 20; $step++) {
                    $x = [int]($StartX + ($EndX - $StartX) * $step / 20)
                    $y = [int]($StartY + ($EndY - $StartY) * $step / 20)
                    [CharmletNativeInput]::MoveCursor($x, $y)
                    Start-Sleep -Milliseconds 35
                }
            }
        } finally {
            [CharmletNativeInput]::Button(4)
        }
    }
    $actual = [CharmletNativeInput+Point]::new()
    if (-not [CharmletNativeInput]::GetCursorPos([ref]$actual)) { throw 'Native cursor position is unavailable.' }
    [pscustomobject]@{
        action = $Action; startX = $StartX; startY = $StartY; endX = $EndX; endY = $EndY
        scaleX = $scaleX; scaleY = $scaleY; actualX = $actual.X; actualY = $actual.Y
        foreground = [CharmletNativeInput]::GetForegroundWindow().ToInt64().ToString()
        target = [CharmletNativeInput]::GetAncestor([CharmletNativeInput]::WindowFromPoint($actual), 2).ToInt64().ToString()
    } | ConvertTo-Json -Compress
} finally {
    [void][CharmletNativeInput]::SetThreadDpiAwarenessContext($priorDpi)
}
