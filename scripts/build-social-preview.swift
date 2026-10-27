import AppKit

let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let output = root.appendingPathComponent("assets/social-preview.jpg")
let width = 1200
let height = 630

func color(_ hex: UInt32) -> NSColor {
    NSColor(
        calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
        green: CGFloat((hex >> 8) & 0xff) / 255,
        blue: CGFloat(hex & 0xff) / 255,
        alpha: 1
    )
}

func drawText(_ text: String, x: CGFloat, y: CGFloat, font: NSFont, color: NSColor) {
    (text as NSString).draw(
        at: NSPoint(x: x, y: y),
        withAttributes: [.font: font, .foregroundColor: color]
    )
}

guard
    let photo = NSImage(contentsOf: root.appendingPathComponent("assets/business-executive.jpg")),
    let mark = NSImage(contentsOf: root.appendingPathComponent("assets/fuhrend-mark.svg")),
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ),
    let context = NSGraphicsContext(bitmapImageRep: bitmap)
else { fatalError("Could not load preview assets") }

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high
color(0xf7f8f5).setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

photo.draw(
    in: NSRect(x: 560, y: 0, width: 640, height: 630),
    from: NSRect(x: 200, y: 0, width: 956, height: 941),
    operation: .copy,
    fraction: 1
)
color(0xd9dfda).setFill()
NSRect(x: 559, y: 0, width: 1, height: height).fill()

mark.draw(in: NSRect(x: 62, y: 502, width: 66, height: 56))
drawText("FUHREND", x: 144, y: 526, font: NSFont(name: "Georgia-Bold", size: 30)!, color: color(0x172c2a))
drawText("MANAGEMENT S.R.O.", x: 145, y: 505, font: NSFont(name: "Georgia", size: 13)!, color: color(0x172c2a))

color(0xa64e36).setFill()
NSRect(x: 66, y: 428, width: 38, height: 2).fill()
drawText("BUSINESS. PEOPLE. POSSIBILITY.", x: 120, y: 420, font: NSFont.systemFont(ofSize: 13, weight: .semibold), color: color(0xa64e36))

drawText("A clearer way", x: 64, y: 307, font: NSFont(name: "Georgia", size: 58)!, color: color(0x172c2a))
drawText("to move forward.", x: 64, y: 239, font: NSFont(name: "Georgia", size: 55)!, color: color(0xa64e36))

drawText("Business consultancy  /  Digital marketing", x: 67, y: 133, font: NSFont.systemFont(ofSize: 17, weight: .medium), color: color(0x40534e))
drawText("Expat services  /  Accommodation", x: 67, y: 106, font: NSFont.systemFont(ofSize: 17, weight: .medium), color: color(0x40534e))
color(0xd9dfda).setFill()
NSRect(x: 66, y: 79, width: 427, height: 1).fill()
drawText("Considered support for what comes next.", x: 67, y: 48, font: NSFont.systemFont(ofSize: 14), color: color(0x566764))

NSGraphicsContext.restoreGraphicsState()
guard let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.86]) else {
    fatalError("Could not encode preview image")
}
try data.write(to: output)
print(output.path)
