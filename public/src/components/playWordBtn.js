var React = require('react');

var Button = require('../bootstrap-components/button');

var PlayWordBtn = React.createClass({

  audioPlayer: null,

  playWord: function(){
    this.audioPlayer.play();
  },

  componentDidMount: function(){
    this.audioPlayer = jQuery('#audio-player')[0];
  },

  render: function() {

    var streamUrl = 'http://d38tzlq9umqxd2.cloudfront.net/' + this.props.s3Key;

    return ( 
      
      <span>
        <audio id='audio-player' src={streamUrl}/>
        <Button text={<i className="icon ion-volume-high"></i>} onClick = {this.playWord} style="word-btn"/>
      </span>
    );
  }
});

module.exports = PlayWordBtn;