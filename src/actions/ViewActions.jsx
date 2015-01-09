var TweenMax = require('TweenMax')

var Dispatcher = require('dispatcher/AppDispatcher')

var ViewActions = {

  hoverOnSongSystem(id) {
    Dispatcher.handleViewAction({
      type: 'HOVER_SYSTEM',
      systemId: id
    })
  },

  hoverOffSongSystem(id) {
    Dispatcher.handleViewAction({
      type: 'HOVER_OFF_SYSTEM'
    })
  },

  clickOnSongSystem(id) {
    Dispatcher.handleViewAction({
      type: 'CLICK_SYSTEM',
      systemId: id
    })

    // this simulates a transition
    TweenMax.delayedCall(0.2, function() {
      Dispatcher.handleViewAction({
        type: 'SHOW_DETAIL',
        systemId: id
      })
    })
  },

  navToGalaxy() {
    Dispatcher.handleViewAction({
      type: 'SHOW_GALAXY'
    })
  }

}

module.exports = ViewActions
