import Toybox.Application.Storage;
import Toybox.Lang;
import Toybox.WatchUi;

// START (of tik op het scherm) = alles uit. UP ingedrukt houden = menu.
class LampenDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() as Boolean {
        getApp().client.allOff();
        return true;
    }

    function onMenu() as Boolean {
        if (getApp().client.isBusy()) {
            return true;
        }
        var menu = new WatchUi.Menu2({ :title => "Lampen" });
        menu.addItem(new WatchUi.MenuItem("Alle lampen", "START zet alles uit", :allLights, null));
        menu.addItem(new WatchUi.MenuItem("Scene kiezen", "bijv. \"Welterusten\"", :scenes, null));
        menu.addItem(new WatchUi.MenuItem("Opnieuw inloggen", null, :relogin, null));
        WatchUi.pushView(menu, new MainMenuDelegate(), WatchUi.SLIDE_UP);
        return true;
    }
}

class MainMenuDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        var client = getApp().client;
        if (id == :allLights) {
            Storage.deleteValue("scene_id");
            Storage.deleteValue("scene_name");
            WatchUi.requestUpdate();
        } else if (id == :scenes) {
            client.loadScenes(method(:onScenesLoaded));
        } else if (id == :relogin) {
            client.logout();
            client.login();
        }
    }

    function onScenesLoaded(scenes as Array<Array<String>>) as Void {
        var menu = new WatchUi.Menu2({ :title => "Scene" });
        for (var i = 0; i < scenes.size(); i++) {
            menu.addItem(new WatchUi.MenuItem(scenes[i][1], null, scenes[i][0], null));
        }
        WatchUi.pushView(menu, new SceneMenuDelegate(), WatchUi.SLIDE_UP);
    }
}

class SceneMenuDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        Storage.setValue("scene_id", item.getId() as String);
        Storage.setValue("scene_name", item.getLabel());
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}
