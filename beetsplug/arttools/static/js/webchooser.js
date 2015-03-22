$(function() {

var app = {};

// ====================== Router ======================

app.Router = Backbone.Router.extend({
    routes: {
        "": "itemQuery",
        "query/(:query)": "itemQuery"
    },
    itemQuery: function(query) {
        if(!query) {
            query = "";
        }
        var queryURL = query.split(/\s+/).map(encodeURIComponent).join('/');
        $.getJSON('/query/' + queryURL, function(data) {
            var results = new app.Albums(data);
            app.appView.showAlbums(results);
        });
    }
});

// ====================== Models ======================

app.Art = Backbone.Model.extend({
    urlRoot: '/art',
    idAttribute: 'file_name',
    isBadSize: function() {
        return this.get('width') < size_thresh || this.get('height') < size_thresh;
    },
    isBadAspectRatio: function() {
        return this.get('aspect_ratio') < ar_thresh;
    },
    isBadArt: function() {
        return this.isBadSize() || this.isBadAspectRatio();
    }
});

app.Arts = Backbone.Collection.extend({
    urlRoot: '/arts',
    model: app.Art
});

app.Album = Backbone.Model.extend({
    urlRoot: '/album',
    idAttribute: 'id',
    initialize: function(data) {
        this.parse(data);
    },
    parse: function(data) {
        var album = this;
        var arts_data = _.map(data.art_files,
                          function(d) {
                            d['album'] = album;
                            return d;
                          });
        var arts = new app.Arts(arts_data);
        this.arts = arts;
    }
});

app.Albums = Backbone.Collection.extend({
    url: '/query/',
    model: app.Album
});

// ====================== Views ======================

app.AlbumView = Backbone.View.extend({
    tagName: "div",
    attributes: {"class": "album"},
    template: _.template($('#album-template').html()),
    events: {
        'click .refresh-album': 'refreshAlbum'
    },
    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'reset', this.render);
        this.listenTo(this.model, 'sync', this.render);
        _.bindAll(this, 'renderArt');
    },
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        this.model.arts.forEach(this.renderArt)
        this.$el.children(".arts").append("<div style='clear: both'></div>");
        return this;
    },
    renderArt: function(art) {
        var artView = new app.ArtView({model: art});
        this.$('div.arts').append(artView.render().el);
    },
    refreshAlbum: function() {
        this.model.fetch();
    }
});

// Art view
app.ArtView = Backbone.View.extend({
    tagName: "div",
    attributes: {"class": "art"},
    template: _.template($('#art-template').html()),
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.addClass(this.model.isBadArt() ? 'badArt' : 'goodArt');
        return this;
    },
    events: {
        'click .artcontainer': 'artClick',
        'click .art-remove': 'artRemove',
        'click .art-choose': 'artChoose'
    },
    artClick: function(ev) {
        var imageUrl = $(ev.target).css('background-image').slice(4, -1);
        imageUrl = imageUrl.replace(/^"?|"?$/g, "");
        $('#artview img').attr('src', imageUrl);
        $('#artview').css('display', 'block');
    },
    artRemove: function(ev) {
        var album = this.model.get('album');
        $.getJSON('/deleteArt/' + album.get('id') + '/' + this.model.get('file_name'), function(data) {
            album.fetch();
        });
    },
    artChoose: function(ev) {
    }
});

// Main app view.
app.AppView = Backbone.View.extend({
    el: $('body'),
    events: {
        'submit #queryForm': 'querySubmit',
        'click #artview': 'closeArtView'
    },
    querySubmit: function(ev) {
        ev.preventDefault();
        var query = $('#query').val();
        app.router.navigate('query/' + escape(query), {trigger: true});
    },
    closeArtView: function(ev) {
        $('#artview').css('display', 'none');
    },
    initialize: function() {
        this.shownAlbums = null;
    },
    showAlbums: function(albums) {
        this.shownAlbums = albums;
        $('#content').empty();
        albums.each(function(album) {
            var view = new app.AlbumView({model: album});
            album.entryView = view;
            $('#content').append(view.render().el);
        });
    }
});
app.router = new app.Router();
app.appView = new app.AppView();

// App setup.
Backbone.history.start({pushState: false});
});