package com.uz.superapp.pro

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.yandex.mapkit.MapKitFactory
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.map.MapWindow
import com.yandex.mapkit.mapview.MapView
// import com.yandex.mapkit.navigation.NavigationFactory
// import com.yandex.mapkit.navigation.Navigator
// import com.yandex.mapkit.navigation.guidance.GuidanceListener

class YandexNavigationViewManager : ViewGroupManager<YandexNavigationView>() {
    override fun getName(): String = "YandexNavigationView"

    override fun createViewInstance(reactContext: ThemedReactContext): YandexNavigationView {
        return YandexNavigationView(reactContext)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
        return mutableMapOf(
            "onArrival" to mutableMapOf("registrationName" to "onArrival")
        )
    }
}

class YandexNavigationView(context: Context) : FrameLayout(context) {
    private val mapView: MapView = MapView(context)
    // private var navigator: Navigator? = null

    init {
        addView(mapView)
        // Initialize MapKit if not already done
        MapKitFactory.getInstance().onStart()
        mapView.onStart()
        
        setupNavigator()
    }

    private fun setupNavigator() {
        // navigator = NavigationFactory.getInstance().createNavigator()
        // ...
    }

    fun onStart() {
        MapKitFactory.getInstance().onStart()
        mapView.onStart()
    }

    fun onStop() {
        mapView.onStop()
        MapKitFactory.getInstance().onStop()
    }
}
