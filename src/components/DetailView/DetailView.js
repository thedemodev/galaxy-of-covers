'use strict';

var d3 = require('d3')
,   Vec2 = require('svec2')

require('components/DetailView/DetailView.scss')

var ViewActions = require('actions/ViewActions')
,   DataUtil = require('util/datautil')
,   SvgUtil = require('util/svgutil')
,   EnergyTails = require('components/DetailView/EnergyTails')
,   DetailShapes = require('components/DetailView/DetailShapes')
,   AxisStar = require('components/DetailView/AxisStar')
,   Axis = require('components/DetailView/Axis')
,   DetailOverlay = require('components/DetailView/DetailOverlay')

var DetailView = {

  applyDetailLayout(datum, state, yOffset) {
    var highlineY = yOffset + (state.get('legendOpen') ? 60 + 175 : 60)
    ,   baselineY = yOffset + window.innerHeight * 4 / 5
    ,   timelineTop = highlineY + (baselineY - highlineY) * 1 / 5
    ,   energyRange = DataUtil.getMinMax(datum.versions, (item) => item.energy || 0)
    ,   timelineYScale = d3.scale.linear().domain(energyRange).range([baselineY, timelineTop])
    ,   timeRange = DataUtil.getMinMax(datum.versions, (item) => item.parsedDate)
    ,   timelineXRange = [100, window.innerWidth - 100]
    ,   timelineXScale = d3.time.scale().domain(timeRange).range(timelineXRange)

    datum.versions.forEach((versionData) => {
      versionData.timelineCX = timelineXScale(versionData.parsedDate)
      versionData.timelineCY = timelineYScale(versionData.energy)
      versionData.timelineBaseY = baselineY
      if (versionData.isCircle) {
        versionData.tailpt1 = [-versionData.timelinePlanetRadius, 0]
        versionData.tailpt2 = [versionData.timelinePlanetRadius, 0]
      } else {
        var a = Math.floor(versionData.numSides / 2) * 2 * Math.PI / versionData.numSides
        ,   pt1 = new Vec2(-1, 0)
        ,   pt2 = new Vec2(Math.cos(a), Math.sin(a))
        ,   diagonal = Vec2.diff(pt2, pt1)
        ,   rot = Vec2.crossProduct(new Vec2(1, 0), diagonal)
        ,   polyPoints = SvgUtil.getOffsetPolygonPointsArray(0, 0, versionData.timelinePlanetRadius, versionData.numSides, rot / 2)

        versionData.polygonPoints = polyPoints
        versionData.tailpt1 = polyPoints[0]
        versionData.tailpt2 = polyPoints[Math.ceil(polyPoints.length / 2)]
      }
    })

    return {
      yOffset: yOffset
    , baselineY: baselineY
    , timelineXScale: timelineXScale
    , layoutWidth: innerWidth
    , layoutHeight: innerHeight
    }
  },

  isActive(node) {
    return d3.select(node).classed('MainView__detail')
  },

  transitionIn(node, data, state, dimensions, callback) {
    var d3Node = d3.select(node)

    d3Node.classed('MainView__galaxy', false)

    var systems = d3Node.selectAll('.SongSystem')

    systems
      .on('mouseenter', null)
      .on('mouseleave', null)
      .on('click', null)

    systems.filter((d) => d.songId !== data.songId)
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove()

    var includedSystems = systems.filter((d) => d.songId === data.songId)

    includedSystems.selectAll('.SongSystem--background, .SongSystem--glowingstar, .SongSystem--orbit, .SongSystem--songtitle')
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove()

    // existing planets
    var it0 = includedSystems.selectAll('.SongSystem--planet')
      .transition()
      .delay(300)
      .duration(800)
      .attr('transform', (d) => SvgUtil.translateString(d.timelineCX, d.timelineBaseY))

    var it1 = it0.transition()
      .duration(200)
      .attr('transform', (d) => SvgUtil.translateString(d.timelineCX, d.timelineBaseY) + ' scale(0)')
      .each('end', DataUtil.before(2, function() {
        callback()
      }))
      .remove()
  },

  render(node, data, state, dimensions) {
    console.log('render detail view');
    var d3Node = d3.select(node)

    d3Node
      .classed('MainView__detail', true)
      .attr('width', dimensions.layoutWidth)
      .attr('height', dimensions.layoutHeight)

    d3Node.datum(dimensions)

    var viewWrapper = d3Node.selectAll('.ViewWrapper')

    if (viewWrapper.empty()) {
      viewWrapper = d3Node.append('g')
        .attr('class', 'ViewWrapper')
    }

    viewWrapper
      .attr('transform', 'translate(0,' + -dimensions.yOffset + ')')

    var energyTailContainer = viewWrapper.selectAll('.SongTimeline--energytailbox')

    if (energyTailContainer.empty()) {
      energyTailContainer = viewWrapper.append('g')
        .attr('class', 'SongTimeline--energytailbox')
    }

    var detailEnergyTails = energyTailContainer.selectAll('.SongTimeline--energytail')
      .data(data.versionsFilteredIn, (d) => d.versionId)

    detailEnergyTails.exit().remove()

    detailEnergyTails.transition('SongSystem-render')
      .duration(200)
      .attr('points', EnergyTails.ExtendedPoints)

    detailEnergyTails.enter().append('polygon')
      .attr('class', 'SongTimeline--energytail')
      .attr('points', EnergyTails.BaselinePoints)
      .transition('SongSystem-render')
      .delay(200)
      .duration(800)
      .attr('points', EnergyTails.ExtendedPoints)

    detailEnergyTails.attr('id', (d) => 'tlenergytail-' + d.versionId)

    var detailPlanetContainer = SvgUtil.acquire(viewWrapper, 'SongTimeline--planetbox', 'g')

    // new planets
    var detailPlanets = detailPlanetContainer.selectAll('.SongTimeline--planet')
      .data(data.versionsFilteredIn, (d) => d.versionId)

    detailPlanets.exit().remove()

    detailPlanets.transition('SongSystem-render')
      .duration(200)
      .attr('transform', (d) => SvgUtil.translateString(d.timelineCX, d.timelineCY))

    detailPlanets.enter().append('g')
      .attr('class', 'SongTimeline--planet')
      .on('mouseenter', this.onPlanetMouseEnter)
      .on('mouseleave', this.onPlanetMouseLeave)
      .attr('transform', (d) => SvgUtil.translateString(d.timelineCX, d.timelineBaseY) + ' scale(0)')
      .transition('SongSystem-render')
      .duration(200)
      .attr('transform', (d) => SvgUtil.translateString(d.timelineCX, d.timelineBaseY) + ' scale(1)')
      .transition('SongSystem-render')
      .duration(800)
      .attr('transform', (d) => SvgUtil.translateString(d.timelineCX, d.timelineCY))

    detailPlanets.attr('id', (d) => 'tlplanetgroup-' + d.versionId)

    // render the shapes
    detailPlanets.call(DetailShapes)

    // detail overlay
    var detailData = state.get('detailOverlay'),
        detailLayer = SvgUtil.acquire(viewWrapper, 'SongTimeline--detaillayer', 'g')
    if (detailData) {
      detailLayer.datum(detailData)
        .call(DetailOverlay.render, dimensions.timelineXScale.range(), dimensions.yOffset)
    } else {
      detailLayer.call(DetailOverlay.deRender)
    }

    // star
    viewWrapper.call(AxisStar, dimensions.baselineY)

    // axis
    viewWrapper.call(Axis, dimensions.baselineY, dimensions.timelineXScale.domain(), dimensions.timelineXScale.range(), data.versionsFilteredIn.map((d) => dimensions.timelineXScale(d.parsedDate)))
  },

  onPlanetMouseEnter(d) {
    ViewActions.hoverOnDetailVersion(d)
  },

  deRender(node, callback) {
    var d3Node = d3.select(node)

    var dimensions = d3Node.datum()

    d3Node.classed('MainView__detail', false)

    // cancel any incoming transition, if applicable
    d3Node.selectAll('.SongSystem--planet').interrupt().transition('SongSystem-derender')

    d3Node.selectAll('.SongDetailStar, .SongTimelineAxis')
      .transition('SongSystem-derender')
      .duration(500)
      .attr('opacity', 0)
      .remove()

    var trailT0 = d3Node.selectAll('.SongTimeline--energytail')
      .transition('SongSystem-derender')
      .duration(500)
      .attr('points', EnergyTails.BaselinePoints)
      .remove()

    var t0 = d3Node.selectAll('.SongTimeline--planet')
      .transition('SongSystem-derender')
      .duration(500)
      .attr('transform', (d) => SvgUtil.translateString(d.timelineCX, d.timelineBaseY))

    t0.transition('SongSystem-derender')
      .duration(200)
      .attr('opacity', 0)
      .remove()
      .each('end', DataUtil.before(2, function() {
        callback()
      }))
  }

}

module.exports = DetailView