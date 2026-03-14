import Foundation
import YandexMapsMobile

@objc(YandexNavi)
class YandexNaviModule: RCTEventEmitter, YMKGuidanceListener {
  
  private var navigator: YMKNavigator?
  private var drivingRouter: YMKDrivingRouter?
  private var drivingSession: YMKDrivingSession?

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return ["onArrival"]
  }

  @objc
  func initialize() {
    DispatchQueue.main.async {
      if self.navigator == nil {
        self.navigator = YMKNavigation.sharedInstance().navigator()
        self.drivingRouter = YMKDirections.sharedInstance().createDrivingRouter()
        self.navigator?.addGuidanceListener(with: self)
      }
    }
  }

  @objc
  func startNavigation(_ lat: Double, lon: Double, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let targetPoint = YMKPoint(latitude: lat, longitude: lon)
    let requestPoints = [
        YMKRequestPoint(point: targetPoint, type: .waypoint, pointContext: nil, outpurRawPoint: nil)
    ]
    
    let options = YMKDrivingOptions()
    let vehicleOptions = YMKVehicleOptions()
    
    drivingSession = drivingRouter?.requestRoutes(with: requestPoints, drivingOptions: options, vehicleOptions: vehicleOptions, routeHandler: { [weak self] (routes, error) in
        if let error = error {
            rejecter("ROUTING_ERROR", error.localizedDescription, error)
            return
        }
        
        guard let routes = routes, let route = routes.first else {
            rejecter("ROUTING_ERROR", "No routes found", nil)
            return
        }
        
        self?.navigator?.route = route
        self?.navigator?.startGuidance(with: route)
        resolver(true)
    })
  }

  @objc
  func stopNavigation() {
    navigator?.stopGuidance()
    navigator?.reset()
  }

  // MARK: - YMKGuidanceListener
  
  func onManeuver() {}
  func onFastestRouteChanged() {}
  func onEndOfRoute() {
    sendEvent(withName: "onArrival", body: ["isFinalDestination": true])
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
