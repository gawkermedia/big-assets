# grunt-big-assets

> Analyzes an AMD project's Javascript (using [madge](https://github.com/pahen/madge)), generating a report of largest Javascript dependencies.

> Dependencies are sorted in descending order by Uglified filesize.

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-big-assets --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-big-assets');
```

## The "big_assets" task

### Overview
In your project's Gruntfile, add a section named `big_assets` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  big_assets: {
    options: {
      base: 'public/javascripts'  // base path to project Javascript (no trailing slash),
      reportPath: 'target/grunt/big-assets.html'  // path to output a report in HTML format (optional)
    },
    files: ['public/javascripts/**/*.js']
  }
});
```

### Options

#### options.base
Type: `String`
Default value: `''`

Base path to the project Javascript, relative to the Gruntfile.

### options.reportPath
Type: `String`
Default value: `undefined`

Optional path to generate an HTML version of the big assets report.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

 * 2014-03-12   v0.1.1   Speed up analysis dramatically by caching intensive calls.
 * 2014-02-14   v0.1.0   Initial rough release, lacks tests or significant configurability.

