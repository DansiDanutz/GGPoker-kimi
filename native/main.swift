import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow?
    private var webView: WKWebView?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        let offlineRules = #"{"trigger":{"url-filter":"^https?://","resource-type":["document","image","style-sheet","script","font","raw","media"]},"action":{"type":"block"}}"#
        let encodedRules = "[\(offlineRules)]"
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "OfflineOnly", encodedContentRuleList: encodedRules) { [weak self] rules, error in
            DispatchQueue.main.async {
                guard let self else { return }
                guard let rules, error == nil else {
                    self.showFatalError("Offline protection could not be enabled: \(error?.localizedDescription ?? "unknown error")")
                    return
                }
                configuration.userContentController.add(rules)
                self.presentWindow(configuration)
            }
        }
        NSApp.activate(ignoringOtherApps: true)
    }

    private func presentWindow(_ configuration: WKWebViewConfiguration) {
        let frame = NSRect(x: 0, y: 0, width: 1440, height: 1000)
        let window = NSWindow(contentRect: frame, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "GGPoker PlayMoney"
        window.minSize = NSSize(width: 320, height: 700)
        window.center()
        window.backgroundColor = NSColor(red: 7 / 255, green: 17 / 255, blue: 15 / 255, alpha: 1)
        window.isReleasedWhenClosed = false

        let webView = WKWebView(frame: window.contentView?.bounds ?? frame, configuration: configuration)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        webView.allowsMagnification = true
        webView.allowsBackForwardNavigationGestures = false
        window.contentView = webView
        self.window = window
        self.webView = webView

        guard let indexURL = Bundle.main.resourceURL?.appendingPathComponent("web/index.html") else {
            showFatalError("The bundled application page is missing.")
            return
        }
        webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
        installMenus()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func installMenus() {
        let mainMenu = NSMenu()
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu(title: "GGPoker PlayMoney")
        appMenu.addItem(NSMenuItem(title: "About GGPoker PlayMoney", action: #selector(showAbout), keyEquivalent: ""))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Reload", action: #selector(reload), keyEquivalent: "r"))
        appMenu.addItem(NSMenuItem(title: "Home", action: #selector(goHome), keyEquivalent: "h"))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Quit GGPoker PlayMoney", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        appItem.submenu = appMenu

        let viewItem = NSMenuItem()
        mainMenu.addItem(viewItem)
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(NSMenuItem(title: "Zoom In", action: #selector(zoomIn), keyEquivalent: "+"))
        viewMenu.addItem(NSMenuItem(title: "Zoom Out", action: #selector(zoomOut), keyEquivalent: "-"))
        viewMenu.addItem(NSMenuItem(title: "Actual Size", action: #selector(actualSize), keyEquivalent: "0"))
        viewMenu.addItem(.separator())
        viewMenu.addItem(NSMenuItem(title: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f"))
        viewMenu.items.last?.keyEquivalentModifierMask = [.command, .control]
        viewItem.submenu = viewMenu
        NSApp.mainMenu = mainMenu
    }

    @objc private func showAbout() {
        let alert = NSAlert()
        alert.messageText = "GGPoker PlayMoney"
        alert.informativeText = "Unofficial offline poker and casino simulation. All balances are play chips with no cash value. No remote accounts, payments, or real-money play."
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    @objc private func reload() { webView?.reload() }
    @objc private func goHome() { webView?.evaluateJavaScript("location.hash = '#/home'; location.reload();") }
    @objc private func zoomIn() { webView?.pageZoom = min(2.5, (webView?.pageZoom ?? 1) + 0.1) }
    @objc private func zoomOut() { webView?.pageZoom = max(0.5, (webView?.pageZoom ?? 1) - 0.1) }
    @objc private func actualSize() { webView?.pageZoom = 1 }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let scheme = navigationAction.request.url?.scheme else { decisionHandler(.cancel); return }
        decisionHandler(scheme == "file" || scheme == "about" ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showFatalError("The local application could not be loaded: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showFatalError("The local application could not be loaded: \(error.localizedDescription)")
    }

    private func showFatalError(_ message: String) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "GGPoker PlayMoney"
        alert.informativeText = message
        alert.addButton(withTitle: "Quit")
        alert.runModal()
        NSApp.terminate(nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.regular)
application.run()
