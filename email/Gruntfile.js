module.exports = function ( grunt ) {
grunt.loadNpmTasks('assemble');
// Loads in any grunt tasks in the package.json file
require('load-grunt-tasks')(grunt);

var appConfig = require( './app.config.js' );

var taskConfig = {
  // HTML Builder
  // Appends scripts and styles, Removes debug parts, append html partials, Template options
  // https://github.com/spatools/grunt-html-build
  htmlbuild: {
    build: {
      files: [{
        expand: true,
        cwd: '<%= build_dir %>/emails/',
        src: ['**/*.html'],
        dest: '<%= build_dir %>/emails/',
      }],
      options: {
        parseTag: 'build',
        beautify: false,
        relative: true,
        styles: {
          vendor: [
            '<%= build_dir %>/vendor/**/*.css'
          ],
          app: [
            '<%= build_dir %>/css/**/*.css'
          ]
        }
      }
    }
  },

  // Clean
  // Clean files and folders.
  // https://github.com/gruntjs/grunt-contrib-clean
  clean: {
      build: [
          '<%= build_dir %>'
      ],
      compile: [
          '<%= compile_dir %>'
      ]
  },

  // grunt-contrib-watch
  // Run tasks whenever watched files change.
  // https://github.com/gruntjs/grunt-contrib-watch
  watch: {

      app_config: {
          files: 'app.config.js',
          tasks: [ 'build' ],
      },

      gruntfile: {
          files: 'Gruntfile.js',
          tasks: [ 'build' ]
      },

      assets: {
          options: {
            livereload: true
          },
          files: ['src/assets/**/*'],
          tasks: [ 'copy:build_assets' ]
      },

      html: {
          options: {
            livereload: true
          },
          files: [ '<%= app_files.html %>' ],
          tasks: [ 'assemble' ]
      },

      sass: {
          options: {
            livereload: true
          },
          files: [ '<%= app_files.styles %>' ],
          tasks: [ 'sass:build', 'autoprefixer:build' ]
      }
  },

  // Sass
  // Compile Sass to CSS (with libsass)
  // https://github.com/sindresorhus/grunt-sass
  sass: {
      build: {
          options: {
              'sourcemap': true,
              'includePaths': ['vendor', 'bower_components']
          },
          files: [{
              expand: true,
              cwd: 'src/sass/',
              src: ['**/*.scss'],
              dest: '<%= build_dir %>/css/',
              ext: '.css'
          }]
      }
  },

  // Autoprefixer
  // Parses CSS and adds vendor-prefixed CSS properties using the Can I Use database.
  // https://github.com/nDmitry/grunt-autoprefixer
  autoprefixer: {
      options: {
          map: true, // Use and update the sourcemap
          browsers: ['last 2 versions', 'ie 9']
      },
      build: {
          src: '<%= build_dir %>/css/**/*.css',
      }
  },

  // Copy
  // Copy files and folders.
  // https://github.com/gruntjs/grunt-contrib-copy
  copy: {
    build_assets: {
      files: [
          {
              src: [ '**' ],
              dest: '<%= build_dir %>/assets/',
              cwd: 'src/assets',
              expand: true
          }
     ]
    },
    compile_assets: {
      files: [
          {
              src: [ '**' ],
              dest: '<%= compile_dir %>/assets',
              cwd: '<%= build_dir %>/assets',
              expand: true
          }
      ]
    },
    build_vendor: {
      files: [
          {
              src: '<%= vendor_files.css %>',
              dest: '<%= build_dir %>/css',
              expand: true,
              flatten: true
          }
      ]
    },
    compile_html: {
      files: [{
        src: [ '**' ],
        dest: '<%= compile_dir %>/emails',
        cwd: '<%= build_dir %>/emails',
        expand: true
      }]
    }
  },

  // ImageMin
  // Minify PNG, JPEG and GIF images
  // https://github.com/gruntjs/grunt-contrib-imagemin
  imagemin: {
      compile: {
          files: [{
              expand: true,
              cwd: '<%= compile_dir %>/assets/images',
              src: ['**/*.{png,jpg,gif}'],
              dest: '<%= compile_dir %>/assets/images'
          }]
      }
  },

  // Connect
  // Start a static web server
  // https://github.com/gruntjs/grunt-contrib-connect
  connect : {
    options: {
      port: 9000,
      //livereload: 35729,
      // change this to '0.0.0.0' to access the server from outside
      hostname: 'localhost'
    },
    livereload: {
      options: {
        open: 'http://localhost:9000/emails/',
        base: [
          '<%= build_dir %>'
        ]
      }
    },
    compile: {
      options: {
        open: 'http://localhost:9000/emails/',
        base: [
          '<%= compile_dir %>'
        ]
      }
    }
  },

  // HTML Min
  // Minify HTML
  // https://github.com/gruntjs/grunt-contrib-htmlmin
  htmlmin: {
    options: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      caseSensitive: true,
      minifyCSS: true
    },
    compile: {
      files: [{
        expand: true,
        cwd: '<%= compile_dir %>',
        src: ['**/*.html'],
        dest: '<%= compile_dir %>'
      }]
    }
  },

  // Assemble
  // Static site generator
  // https://github.com/assemble/assemble
  assemble: {
    options: {
      layoutdir: 'src/layouts',
      partials: ['src/partials/**/*.hbs'],
      data: ['src/data/*.{json,yml}'],
      flatten: true
    },
    pages: {
      src: ['src/emails/**/*.hbs'],
      dest: '<%= build_dir %>/emails/'
    }
  },

  // Premailer
  // Grunt wrapper task for Premailer
  // https://github.com/dwightjack/grunt-premailer/
  premailer: {
    compile: {
      options: {
        verbose: true,
        preserveStyles: true
      },
      files: [{
        expand: true,
        cwd: '<%= compile_dir %>/emails',
        src: ['**/*.html'],
        dest: '<%= compile_dir %>/emails'
      }]
    }
  },

  // Process HTML
  // Process html files at build time to modify them depending on the release environment
  // https://github.com/dciccale/grunt-processhtml
  processhtml : {
    compile: {
      files: [{
        expand: true,
        cwd: '<%= build_dir %>/emails',
        src: ['**/*.html'],
        dest: '<%= compile_dir %>/emails'
      }]
    }
  }
};

grunt.initConfig( grunt.util._.extend( taskConfig, appConfig ) );

grunt.registerTask( 'server', [ 'build', 'connect:livereload', 'watch' ] );
grunt.registerTask( 'default', [ 'server' ] );

grunt.registerTask('build', [
    'clean:build',
    'copy:build_assets', 'copy:build_vendor',
    'sass:build', 'autoprefixer:build',
    'assemble'
]);

grunt.registerTask('compile', [
  'build',
  'clean:compile',
  'copy:compile_assets',
  'imagemin:compile',
  'processhtml:compile',
  'premailer:compile',
  'htmlmin:compile',
])

};