var fs = require('fs');
var spawn = require('child_process').spawn;
var ffmpeg = require('fluent-ffmpeg');
var path = require('path');
var BbPromise = require('bluebird');
var readdir = BbPromise.promisify(fs.readdir);
var stat = BbPromise.promisify(fs.stat);
var util = require('./util');
var config = require('./config/config');

var outputDir = config.outputDir;

module.exports = function() {
  console.log('Standardising word lengths for ' + outputDir);
  return new BbPromise(function(resolve, reject) {
    readdir(outputDir)
      .then(function(dirs) {
        // Add full directory paths
        dirs = dirs.map(function(dir) {
          return path.join(outputDir, dir);
        });
        // Filter out any non-directories
        return BbPromise.filter(dirs, function(dir) {
          return stat(dir)
            .then(function(stats) {
              return stats.isDirectory();
            });
        });
      })
      .then(function(directories) {
        return BbPromise.map(directories, function(dir) {
          return _standardiseWordDirectory(dir);
        }, {concurrency: config.concurrencyLimit});
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        util.handleError(err);
      });
  });
};

var _standardiseWordDirectory = function(dir) {

  var audioFileMetaData = [];

  // Get each audio file
  return _getAudioFiles(dir)
    .then(function(files) {

      // Get an array of promises containing ffprobe commands
      // Each command will find the metadata for each bound file
      var ffprobeCommands = files.map(function(file) {
        return _getFileInfo.bind(this, file);
      });

      // Execute ffprobe commands to get metadata
      return BbPromise.map(ffprobeCommands, function(command) {
        return command();
      }, {concurrency: config.concurrencyLimit});

    })
    .then(function(fileData) {

      // Find average duration for all the files
      var avg = fileData.reduce(function(total, file) {
        return total + file.duration;
      }, 0) / fileData.length;

      // Get an array of promises containing ffmpeg commands
      // Each will modify the tempo of the file to make them standard lengths
      var commands = fileData.map(function(file) {
        return _modifyTempo.bind(this, file, avg);
      });

      return BbPromise.map(commands, function(command) {
        return command();
      }, {concurrency: config.concurrencyLimit});
    });
};

var _getAudioFiles = function(directory) {
  return new BbPromise(function(resolve, reject) {
    fs.readdir(directory, function(err, metadata) {
      if (err) {
        reject(err);
      }

      var audioFiles = metadata.filter(function(file) {

        return path.extname(file) === '.wav';

      }).map(function(file) {
        return path.join(directory, file);
      });

      resolve(audioFiles);
    });
  });
};

var _getFileInfo = function(file) {

  return new BbPromise(function(resolve, reject) {
    var content;
    var ffmpeg_probe = spawn('node', ['./dataScraping/lib/spawn/probeAudio.js', file]);

    ffmpeg_probe.stderr.on('data', function(err) {
      reject(err.toString());
    });

    ffmpeg_probe.stdout.on('data', function(data) {
      content = JSON.parse(data.toString());
    });

    ffmpeg_probe.on('exit', function() {
      resolve({
        file: file,
        duration: content.format.duration
      });
    });
  });
};

var _modifyTempo = function(file, avg) {

  var tempo = file.duration / avg;
  var filename = path.basename(file.file, '.wav');
  var dirname = path.dirname(file.file);
  var newFile = path.join(dirname, 'standard', filename + '.wav');

  return new BbPromise(function(resolve, reject) {


    var ffmpeg_split = spawn('node', ['./dataScraping/lib/spawn/modifyTempo.js', file.file, newFile, tempo]);

    ffmpeg_split.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    ffmpeg_split.stderr.on('data', function(err) {
      reject(err.toString());
    });

    ffmpeg_split.on('exit', function() {
      resolve();
    });

  });
};