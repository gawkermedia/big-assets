/*global module, require, Buffer */
module.exports = function (grunt) {
	'use strict';

	grunt.registerMultiTask('big-assets', 'List biggest project dependencies', function () {

		var _ = require('underscore'),
			madge = require('madge'),
			print = require('node-print'),
			ProgressBar = require('progress'),
			uglify = require('uglify-js'),
			fs = require('fs');

		var dependencyTree,
			options,
			table = [],
			tableHTML = '',
			tableTemplate,
			walkDepTree;

		function getUglifiedSize(file) {
			return (Buffer.byteLength(uglify.minify(file).code, 'utf8') / 1024).toFixed(2);
		}

		options = this.options({
			base: '', // base folder for project Javascript, defined without trailing slash
			reportPath: '',
			fieldOrder: ['name', 'requiredByCount', 'requiredBy', 'sizeKB', 'sizeKBUglified'],
			fieldNames: ['Filename', '# Dependent Modules', 'Dependent Modules', 'Filesize (KB)', 'Uglified filesize (KB)']
		});

		dependencyTree = madge(options.base, {
			format: 'amd'
		});

		walkDepTree = _.memoize(function (paths, alreadySeen) {
			if (!alreadySeen) {
				alreadySeen = [];
			}
			// Given a set of AMD module paths, walk the dependencies for each path until the ultimate
			// dependency is reached, returning the list of top-level dependencies for each path.
			var nextDeps = _.map(paths, function (path) {
				var depends;

				depends = dependencyTree.depends(path);

				if (!depends.length) {
					// We've hit the end of the dependency tree
					return path;
				} else if (_.contains(alreadySeen, path)) {
					// We've hit a circular dependency
					return [];
				} else {
					alreadySeen.push(path);
					return walkDepTree(depends, alreadySeen);
				}
			});

			return _.uniq(_.flatten(nextDeps));
		});

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
					stat = fs.statSync(filepath),
					requiredBy;

				// Get modules that are dependent on this one
				requiredBy = walkDepTree([amdPath]);

				// Filter current module from list of own dependencies
				requiredBy = _.filter(requiredBy, function (path) {
					return path !== amdPath;
				});

				if (requiredBy.length) {
					table.push({
						name: filepath.replace(options.base + '/', ''),
						requiredByCount: requiredBy.length,
						requiredBy: _.map(requiredBy, function (f) {
							var p = f.split('/');
							return p[p.length - 1];
						}),
						sizeKB: (stat.size / 1024).toFixed(2),
						sizeKBUglified: getUglifiedSize(filepath)
					});
				}
				bar.tick();
			});

		});

		// Sort table by descending uglified filesize
		table = _.sortBy(table, function (file) {
			return file.sizeKBUglified * -1;
		});
		print.pt(_.map(table, function (row) {
			// Only print first 3 dependent modules per row
			row = _.clone(row);
			row.requiredBy = row.requiredBy.slice(0, 3).join(', ');
			return row;
		}));

		grunt.log.writeln('Total uglified size: ' + _.reduce(table, function (memo, file) {
			return memo + parseInt(file.sizeKBUglified, 10);
		}, 0) + ' KB');

		// Write out an HTML report if a report path was specified
		if (options.reportPath) {
			tableTemplate = '<!doctype html>\n' + '<html><body>' +
				'<table><thead><% _.each(fields, function(name) { %> <th><%= name %></th> <% }); %></thead>' +
				'<% _.each(table, function(row) { %><tr>' +
				'	<% _.each(row, function(field) { %><td><%= field %></td> <% }); %>' +
				'</tr><% }); %></tr>' +
				'</table></body></html>';

			tableHTML = _.template(tableTemplate)({
				fields: options.fieldNames,
				table: _.map(table, function (row) {
					return _.map(options.fieldOrder, function (fieldName) {
						var value = row[fieldName];
						return _.isArray(value) ? value.join(', ') : value;
					});
				})
			});
			grunt.file.write(options.reportPath, tableHTML);
			grunt.log.writeln('Wrote report to "' + options.reportPath + '"');
		}
	});
};
