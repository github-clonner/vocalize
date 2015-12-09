var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');
var path = require('path');
var BbPromise = require('bluebird');


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
      })

      resolve(audioFiles);
    });
  });
};

var _getFileInfo = function(file) {
  return new BbPromise(function(resolve, reject) {
    ffmpeg.ffprobe(file, function(err, metadata) {
      if (err) {
        reject(err);
      }
      resolve({
        file: file,
        metadata: metadata,
        duration: metadata.format.duration
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

    ffmpeg(file.file)
    	.audioCodec('pcm_f32le')
      .audioFilters('atempo=' + tempo)
      .output(newFile)
      .on('end', function(err){
      	if(err){
      		reject(err);
      	}
      	resolve();
      })
      .on('error', function(err){
      	reject(err);
      })
      .run();
  });
};

module.exports = function(directory) {

  var dir = path.join(__dirname, '..', 'output', directory);
  var audioFileMetaData = [];

  // Get each audio file
  _getAudioFiles(dir)
    .then(function(files) {

      // Get an array of promises containing ffprobe commands
      // Each command will find the metadata for each bound file
      return ffprobeCommands = files.map(function(file) {
        return _getFileInfo.bind(this, file);
      });

    })
    .then(function(ffprobeCommands) {

      // Execute ffprobe commands to get metadata
      return BbPromise.map(ffprobeCommands, function(command) {
        return command();
      });

    })
    .then(function(fileData) {

      // Find average duration for all the files
      var avg = fileData.reduce(function(total, file) {
        return total + file.duration;
      }, 0) / fileData.length;

      // Get an array of promises containing ffmpeg commands
      // Each will modify the tempo of the file to make them standard lengths
      return fileData.map(function(file) {
        return _modifyTempo.bind(this, file, avg);
      });
    })
    .then(function(commands) {
      
      return BbPromise.each(commands, function(command){
      	command();
      })
      .then(function(){
      	console.log('Standardized Times for: ' + path.basename(directory));
      });
    });
};