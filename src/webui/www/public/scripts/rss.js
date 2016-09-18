var syncRSSLastResponseId = 0;
var syncRSSDataTimer;
var RSSViewFullyLoaded = false;
var RSSData = {};
var doSyncData = function(from, to) {};
var onRSSDataChanged = function() {};
var updateRSSFeedsList = function() {};
var selectedFeedId = '';

var isRSSViewFullyLoaded = function() {
    if (RSSViewFullyLoaded)
        return true;
    if ($('rssFeedsList')) {
        RSSViewFullyLoaded = true;
        return true;
    }
    return false;
}

var syncRSSData = function() {
    if (!isRSSViewFullyLoaded()) {
        syncRSSDataTimer = syncRSSData.delay(100);
        return;
    }

    if (currentView !== 'rss') {
        syncRSSDataTimer = syncRSSData.delay(syncMainDataTimerPeriod);
        return;
    }

    var url = new URI('sync/rss');
    url.setData('rid', syncRSSLastResponseId);

    var request = new Request.JSON({
        url : url,
        noCache : true,
        method : 'get',
        onFailure : function () {
            $('error_div').set('html', 'клиент qBittorrent недоступен');
            clearTimeout(syncRSSDataTimer);
            syncRSSDataTimer = syncRSSData.delay(2000);
        },
        onSuccess : function (response) {
            $('error_div').set('html', '');
            if (response) {
                if (response['rid']) {
                    syncRSSLastResponseId = response['rid'];
                }
                if (response['full_update'] === true)
                    RSSData = {};
                doSyncData(response, RSSData, 'feeds');
                onRSSDataChanged();
            }
            clearTimeout(syncRSSDataTimer);
            syncRSSDataTimer = syncRSSData.delay(syncMainDataTimerPeriod);
        }
    }).send();
}

updateRSSData = function() {
    clearTimeout(syncRSSDataTimer);
    syncRSSDataTimer = syncRSSData.delay(100);
}

doSyncData = function(from, to, key) {
    if (typeof from[key] !== 'undefined' && typeof from[key] !== 'object') {
        to[key] = from[key];
        return;
    }
    if (!to[key])
        to[key] = {};
    if (from[key]) {
        for (var key2 in from[key]) {
            if (!to[key][key2])
                to[key][key2] = {};
            doSyncData(from[key], to[key], key2);
        }
    }
    if (from[key + '_removed']) {
        for (var i = 0; i < from[key + '_removed'].length; i++) {
            delete to[key][from[key + '_removed'][i]];
        }
    }
};

onRSSDataChanged = function() {
    updateRSSFeedsList();
};

var updateFeedElement = function(li, imageURL, name, unreadCount) {
    var html = '<a href="#"><img src="' + imageURL + '">' + escapeHtml(name) + ' (' + unreadCount + ')</a>';

    if (li.innerHTML !== html)
        li.innerHTML = html;
}

updateRSSFeedsList = function() {
    var lis = $('rssFeedsList').getChildren('li');
    var previousLi = lis[0];
    var unreadLi = lis[0];
    var selectedFound = false;
    var totalUnreadCount = 0;

    if (unreadLi.hasClass('selectedFilter'))
        selectedFound = true;

    lis.splice(0, 1);

    var keys = [];

    for (var feedId in RSSData['feeds']) {
        keys.push(feedId);
    }

    // sort RSS feeds by name
    keys.sort(function(a, b) {
        if (RSSData['feeds'][a]['name'].toUpperCase() < RSSData['feeds'][b]['name'].toUpperCase())
            return -1;
        if (RSSData['feeds'][a]['name'].toUpperCase() > RSSData['feeds'][b]['name'].toUpperCase())
            return 1;
        return 0;
    });

    for (var k = 0; k < keys.length; k++) {
        var feed = RSSData['feeds'][keys[k]];
        var li = null;
        var unreadCount = 0;

        for (var i = 0; i < lis.length; i++)
        {
            if (lis[i].feedId === feedId) {
                li = lis[i];
                lis.splice(i, 1);
                break;
            }
        }

        if (!li) {
            li = new Element('li');
            li.feedId = feedId;
        }

        if (li.getPrevious() !== previousLi)
        {
            li.inject(previousLi, 'after');
        }

        var articles = feed['articles'];

        for (var articleId in articles) {
            if (!articles[articleId].read)
                unreadCount++;
        }

        totalUnreadCount += unreadCount;

        updateFeedElement(li, feed['icon_path'], feed['name'], unreadCount);

        if (li.hasClass('selectedFilter'))
            selectedFound = true;

        previousLi = li;
    }

    for (var i = 0; i < lis.length; i++)
        lis[i].dispose();

    updateFeedElement(unreadLi, 'theme/mail-folder-inbox', 'QBT_TR(Unread)QBT_TR', totalUnreadCount);

    if (!selectedFound) {
        selectedFeedId = '';
        unreadLi.addClass('selectedFilter');
    }
}

updateRSSData();
