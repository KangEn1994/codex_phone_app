import UIKit
import WebKit

final class WebContainerViewController: UIViewController {
    private lazy var webView: WKWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.applicationNameForUserAgent = ShellConfig.userAgentSuffix
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }()

    private let loadingIndicator: UIActivityIndicatorView = {
        let view = UIActivityIndicatorView(style: .large)
        view.translatesAutoresizingMaskIntoConstraints = false
        view.hidesWhenStopped = true
        return view
    }()

    private let errorOverlay: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.isHidden = true
        return stack
    }()

    private let errorTitleLabel: UILabel = {
        let label = UILabel()
        label.font = .preferredFont(forTextStyle: .title2)
        label.text = "页面暂时无法打开"
        return label
    }()

    private let errorMessageLabel: UILabel = {
        let label = UILabel()
        label.font = .preferredFont(forTextStyle: .body)
        label.text = "请检查网络或服务状态后重试。"
        label.numberOfLines = 0
        label.textAlignment = .center
        return label
    }()

    private lazy var retryButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("重试", for: .normal)
        button.addTarget(self, action: #selector(retryLoad), for: .touchUpInside)
        return button
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        title = "CodexApp"
        setupLayout()
        loadHome()
    }

    private func setupLayout() {
        view.addSubview(webView)
        view.addSubview(loadingIndicator)
        view.addSubview(errorOverlay)

        errorOverlay.addArrangedSubview(errorTitleLabel)
        errorOverlay.addArrangedSubview(errorMessageLabel)
        errorOverlay.addArrangedSubview(retryButton)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),

            errorOverlay.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            errorOverlay.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            errorOverlay.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            errorOverlay.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
    }

    private func loadHome() {
        showLoading()
        let request = URLRequest(url: ShellConfig.baseWebURL, cachePolicy: .useProtocolCachePolicy)
        webView.load(request)
    }

    @objc
    private func retryLoad() {
        showLoading()
        hideError()
        webView.reload()
    }

    private func showLoading() {
        loadingIndicator.startAnimating()
    }

    private func hideLoading() {
        loadingIndicator.stopAnimating()
    }

    private func showError(_ message: String) {
        errorMessageLabel.text = message
        errorOverlay.isHidden = false
        hideLoading()
    }

    private func hideError() {
        errorOverlay.isHidden = true
    }
}

extension WebContainerViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        showLoading()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        hideError()
        hideLoading()
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        let url = navigationAction.request.url
        switch NavigationPolicy.evaluate(url) {
        case .inApp:
            decisionHandler(.allow)
        case .external:
            if let url {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        case .blocked:
            showError("当前链接不允许在应用内打开。")
            decisionHandler(.cancel)
        }
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        showError(error.localizedDescription)
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        showError(error.localizedDescription)
    }
}
