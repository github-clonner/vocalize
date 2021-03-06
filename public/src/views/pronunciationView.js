var React = require('react');
var ReactCSSTransitionGroup = require('react-addons-css-transition-group'); 

// Components
var Title = require('../components/title');
var Instructions = require('../components/instructions');
var TargetWord = require('../components/targetWord');
var PlayWordBtn = require('../components/playWordBtn');
var RecordAudioBtn = require('../components/recordAudioBtn');
var WordControls = require('../components/wordControls');
var Score = require('../components/score');
var Footer = require('../components/footer');

// Services
var WordService = require('../actions/wordService');
var UserAudio = require('../actions/userAudio');

var PronunciationView = React.createClass({

  recordRTC: null,

  // Accent isn't used to get a word from Word Service,
  // but included in here for later incorporation
  getInitialState: function() {
    return {
      language: 'english',
      gender: 'male',
      accent: 'general',
      targetWord: null,
      percentCorrect: null,
      peaks: null,
      showScore: false
    };
  },

  handleScore: function(data) {
    var roundedScore = Math.floor(data.score - 50);
    this.setState({
      showScore: true,
      percentCorrect: roundedScore,
      peaks: data.peaks
    });

    console.log(data);
  },

  handleUserSettingsChange: function(e){
    var newState = {};
    newState[e.currentTarget.name] = e.currentTarget.value;
    this.setState(newState);
  },

  handleRetry: function(){
    this.setState({
      showScore: false
    });
  },

  setTargetWord: function(previous) {
    
    this.setState({
      showScore: false
    });

    WordService.loadWordFromServer.call(this, previous)
      .then(function(data) {
        this.setState({
          targetWord: data.word,
          s3Key: data.s3.Key
        });
      }.bind(this));
  },

  componentDidMount: function() {
    this.setTargetWord(false);
  },

  render: function() {

    var TitleProps = {
      handleChange: this.handleUserSettingsChange,
      language: this.state.language,
      gender: this.state.gender,
      accent: this.state.accent
    };

    var WordControlsProps = {
      s3Key: this.state.s3Key,
      nextWord: this.setTargetWord.bind(this, false),
      previousWord: this.setTargetWord.bind(this, true),
      retry: this.state.showScore,
      onRetry: this.handleRetry
    };

    return (
      <div className="root">
        <Title {...TitleProps}/>

        <div id="betaBanner">Beta</div>

        <div className="container-fluid">
          <div className="row max-height">
            <div className="col-md-12 content-container">
              <TargetWord targetWord = {this.state.targetWord } />

              <div className="mic-controls-container">
                <ReactCSSTransitionGroup transitionName="fade" transitionEnterTimeout={500} transitionLeaveTimeout={1}>
                  {this.state.showScore ? 
                    <Score percentCorrect={this.state.percentCorrect} peaks={this.state.peaks} language={this.state.language} key="1" /> :
                    <RecordAudioBtn key="2" handleScore={this.handleScore} />
                  }
                </ReactCSSTransitionGroup>

              </div>
              <WordControls {...WordControlsProps}/>
              <Instructions />
            </div>
          </div>
          <div className="row">
            <div className="col-md-12">
              <Footer />
            </div>
          </div>
        </div>    
      </div>
    );
  }
});

module.exports = PronunciationView;

