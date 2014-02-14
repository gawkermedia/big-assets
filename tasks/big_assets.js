/*global module, require, Buffer */
module.exports = function (grunt) {
	'use strict';

	grunt.registerMultiTask('big-assets', 'List biggest project dependencies', function () {

		var _ = require('underscore'),
			madge = require('madge'),
			print = require('node-print'),
			ProgressBar = require('progress'),
			uglify = require('uglify-js'),
			fs = require('fs'),
			table = [],
			dependencyTree,
			walkDepTree;

		var options = this.options({
			base: '' // base folder for project Javascript, defined without trailing slash
		});

		dependencyTree = madge(options.base, {
			format: 'amd'
		});
		walkDepTree = function (paths) {
			// Given a set of AMD module paths, walk the dependency for each path until the ultimate
			// dependency is reached, returning the list of top-level dependencies for each path. */
			var nextDeps = _.map(paths, function (path) {
				if (!path) {
					return false;
				}
				var depends = dependencyTree.depends(path);
				if (!depends.length) {
					return path;
				} else {
					return walkDepTree(depends);
				}
			});
			return _.uniq(_.flatten(nextDeps));
		};

		var getUglifiedSize = function (file) {
			return (Buffer.byteLength(uglify.minify(file).code, 'utf8') / 1024).toFixed(2);
		};

		// Loop through file groups
		this.files.forEach(function (file) {
			var bar, filesInGroup;

			// Exclude nonexistent files
			filesInGroup = file.src.filter(function (filepath) {
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
					return false;
				} else {
					return true;
				}
			});

			bar = new ProgressBar('Finding biggest dependencies [:bar] :percent :etas', { total: filesInGroup.length, width: 50 });

			// Walk through files in group, obtaining their dependencies and sizes
			filesInGroup.map(function (filepath) {
				var amdPath = filepath.replace(options.base + '/', '').replace('.js', ''),
					stat = fs.statSync(filepath);

				// Get modules that are dependent on this one
				var requiredBy = walkDepTree([amdPath]);

				// Filter current module from list of own dependencies
				requiredBy = _.filter(requiredBy, function (path) {
					return path !== amdPath;
				});

				if (requiredBy.length) {
					table.push({
						name: filepath.replace(options.base + '/', ''),
						requiredByCount: requiredBy.length,
						requiredByFirst3: _.map(requiredBy.slice(0, 3), function (f) {
							var p = f.split('/');
							return p[p.length - 1];
						}).join(', '),
						sizeKB: (stat.size / 1024).toFixed(2),
						sizeKBUglified: getUglifiedSize(filepath)
					});
				}
				bar.tick();
			});

		});

		// Sort table by descending uglified filesize
		table = _.sortBy(table, function (file) {
			return file.sizeKBUglified * - 1;
		});
		print.pt(table);

		grunt.log.writeln('Total uglified size: ' + _.reduce(table, function (memo, file) {
			return memo + parseInt(file.sizeKBUglified, 10);
		}, 0) + ' KB');
		
	});
};
