import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.WatchUi;

class LampenApp extends Application.AppBase {
    var client as SmartThingsClient;

    function initialize() {
        AppBase.initialize();
        client = new SmartThingsClient();
    }

    function onStart(state as Dictionary?) as Void {
        // Direct registreren: het OAuth-resultaat kan binnenkomen nadat de app opnieuw is gestart.
        Communications.registerForOAuthMessages(client.method(:onOAuthMessage));
    }

    function getInitialView() {
        var view = new LampenView();
        client.setListener(view.method(:onStatus));
        return [view, new LampenDelegate()];
    }
}

function getApp() as LampenApp {
    return Application.getApp() as LampenApp;
}
