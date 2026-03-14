import Foundation
import UIKit
import YandexMapsMobile

@objc(YandexNavigationViewManager)
class YandexNavigationViewManager: RCTViewManager {
  override func view() -> UIView! {
    return YandexNavigationView()
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

class YandexNavigationView: UIView, YMKGuidanceListener {
  private var mapView: YMKMapView!
  private var navigator: YMKNavigator?

  override init(frame: CGRect) {
    super.init(frame: frame)
    mapView = YMKMapView(frame: self.bounds)
    mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(mapView)
    
    setupNavigator()
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  private func setupNavigator() {
    navigator = YMKNavigation.sharedInstance().navigator()
    navigator?.addGuidanceListener(with: self)
    // Link to map window if needed
  }

  // MARK: - YMKGuidanceListener
  
  func onManeuver() {}
  func onFastestRouteChanged() {}
  func onEndOfRoute() {
    // Dispatch event to JS
  }
  func onRoadNameChanged() {}
  func onLocationUpdated() {}
  func onSpeedLimitUpdated() {}
  func onSpeedLimitExceeded() {}
  func onSpeedLimitNotExceeded() {}
  func onSpeedLimitExceededUpdated() {}
  func onParkingRoutesChanged() {}
  func onAlternativesChanged() {}
  func onBetterAlternativeAvailable() {}
}
