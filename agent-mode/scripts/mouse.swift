// Experimental: real (trusted) mouse click at screen coordinates. Needs Accessibility permission for the host app.
// usage: mouse x y [right] [count]
import CoreGraphics
import Foundation

let a = CommandLine.arguments
guard a.count >= 3, let x = Double(a[1]), let y = Double(a[2]) else { FileHandle.standardError.write("usage: mouse x y [right] [count]\n".data(using: .utf8)!); exit(2) }
let right = a.count > 3 && a[3] == "right"
let count = a.count > 4 ? Int(a[4]) ?? 1 : 1
let p = CGPoint(x: x, y: y)
let down: CGEventType = right ? .rightMouseDown : .leftMouseDown
let up: CGEventType = right ? .rightMouseUp : .leftMouseUp
let btn: CGMouseButton = right ? .right : .left
CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: p, mouseButton: .left)?.post(tap: .cghidEventTap)
usleep(60_000)
for i in 1...max(1, count) {
    for t in [down, up] {
        let e = CGEvent(mouseEventSource: nil, mouseType: t, mouseCursorPosition: p, mouseButton: btn)
        e?.setIntegerValueField(.mouseEventClickState, value: Int64(i))
        e?.post(tap: .cghidEventTap)
        usleep(40_000)
    }
}
