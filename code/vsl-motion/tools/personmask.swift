// personmask.swift - person segmentation masks for every frame in a folder (Apple Vision, runs on the Neural Engine).
//
//   swiftc -O tools/personmask.swift -o tools/personmask
//   tools/personmask <frames_dir> <masks_dir>
//
// Frames are read in name order through ONE VNSequenceRequestHandler, so Vision smooths the mask over time.
// Each mask is written as an 8-bit grayscale PNG (255 = person) at the frame's own size.
import AppKit
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
    print("usage: personmask <frames_dir> <masks_dir>")
    exit(2)
}
let inDir = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let names = (try FileManager.default.contentsOfDirectory(atPath: inDir.path))
    .filter { $0.hasSuffix(".jpg") || $0.hasSuffix(".png") }
    .sorted()
let ctx = CIContext(options: [.useSoftwareRenderer: false])
let handler = VNSequenceRequestHandler()
let gray = CGColorSpaceCreateDeviceGray()
var done = 0
let t0 = Date()

for name in names {
    autoreleasepool {
        let src = inDir.appendingPathComponent(name)
        guard let img = CIImage(contentsOf: src) else { print("skip \(name)"); return }
        let req = VNGeneratePersonSegmentationRequest()
        req.qualityLevel = .accurate
        req.outputPixelFormat = kCVPixelFormatType_OneComponent8
        do {
            try handler.perform([req], on: img)
        } catch {
            print("vision error on \(name): \(error)")
            return
        }
        guard let obs = req.results?.first else { print("no mask \(name)"); return }
        let mask = CIImage(cvPixelBuffer: obs.pixelBuffer)
        // scale the mask to the frame size
        let sx = img.extent.width / mask.extent.width
        let sy = img.extent.height / mask.extent.height
        let scaled = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
        let outURL = outDir.appendingPathComponent((name as NSString).deletingPathExtension + ".png")
        do {
            try ctx.writePNGRepresentation(of: scaled, to: outURL, format: .L8, colorSpace: gray)
        } catch {
            print("write error \(name): \(error)")
        }
        done += 1
        if done % 100 == 0 {
            print("\(done)/\(names.count)  \(String(format: "%.1f", Double(done) / Date().timeIntervalSince(t0))) fps")
        }
    }
}
print("done \(done) masks in \(String(format: "%.1f", Date().timeIntervalSince(t0))) s")
