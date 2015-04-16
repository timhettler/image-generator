module.exports = {

    build_dir: 'build',
    compile_dir: 'dist',

    meta: {
        title: '',
        description: '',
        viewport: 'width=device-width, initial-scale=1, user-scalable=no, minimal-ui'
    },

    app_files: {
        main: ['app.module.js'],
        js: ['src/js/**/*.js'],
        atpl: [ 'src/templates/*.tpl.html' ],
        html: ['src/*.html'],
        data: ['src/data/**/*'],
        styles: ['src/sass/**/*'],
        favicon: ['src/assets/images/favicon.png']
    },

    vendor_files: {
        js: [
            'bower_components/angular/angular.js',
            'bower_components/zepto/zepto.js',
            'bower_components/canvg/dist/canvg.bundle.js',
            'bower_components/handlebars/handlebars.min.js',
            'vendor/jscanvas/jscanvas.js',
            'vendor/hypher/_hypher.js',
            'vendor/hypher/en-us.js'
        ],
        css: []
    }
};
