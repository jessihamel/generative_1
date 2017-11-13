import './styles.css';

import {line, curveBasis} from 'd3-shape'
import {cubehelix} from 'd3-color'
import TWEEN from '@tweenjs/tween.js'

class GraphicGenerator {
  constructor() {
    this._animate = this._animate.bind(this)

    // init canvas
    this._w = window.innerWidth
    this._h = window.innerHeight
    this._canvas = document.createElement('canvas')
    this._canvas.width = this._w
    this._canvas.height = this._h
    document.body.appendChild(this._canvas)
    this._ctx = this._canvas.getContext('2d')

    // dat.gui variables
    this.complexity = 35
    this.amplitude = 300
    this.color1 = '#ff111c'
    this.color2 = '#1f79ed'
    this.color3 = '#e9ee55'

    // init values for tweening
    this._nSegments0 = 10
    this._nSegments1 = 7
    this._radialPts0 = this._generateRadialPts()
    this._radialPts1 = this._generateRadialPts()
    this._pts0 = this._generatePts(this._nSegments0)
    this._pts1 = this._generatePts(this._nSegments0)
    this._pts2 = this._generatePts(this._nSegments1)
    this._pts3 = this._generatePts(this._nSegments1)
    this._t = 0
    this._startTween()

    // init dat.gui
    this._gui = new dat.GUI()
    this._gui.add(this, 'complexity', 15, 70).step(1)
    this._gui.add(this, 'amplitude', 50, 500).step(10)
    this._gui.addColor(this, 'color1')
    this._gui.addColor(this, 'color2')
    this._gui.addColor(this, 'color3')

    window.addEventListener('resize', this._resize.bind(this))
    window.requestAnimationFrame(this._animate)
  }

  _resize() {
    this._w = window.innerWidth
    this._h = window.innerHeight
    this._canvas.width = this._w
    this._canvas.height = this._h
  }

  _animate() {
    window.requestAnimationFrame(this._animate)
    TWEEN.update()
    this._resetCanvas()
    this._draw()
  }

  _startTween() {
    this._tween = new TWEEN.Tween(this)
      .to({_t: 1}, 8000)
      .interpolation( TWEEN.Interpolation.Bezier )
      .start()
      .onComplete(() => {
        this._t = 0
        this._radialPts0 = this._radialPts1
        this._radialPts1 = this._generateRadialPts()
        this._pts0 = this._pts1
        this._pts1 = this._generatePts(this._nSegments0)
        this._pts2 = this._pts3
        this._pts3 = this._generatePts(this._nSegments1)
        this._startTween()
      })
  }

  _resetCanvas() {
    this._ctx.resetTransform()
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this._ctx.translate(this._w / 2, this._h / 2)
  }

  _draw() {
    this._drawRadialLines(this._radialPts0, this._radialPts1)
    this._drawRadialCurves(this._pts0, this._pts1, this.color2)
    this._drawRadialCurves(this._pts2, this._pts3, this.color3)
  }

  /**
  * Generates a randomish set of points that are used to draw curves around the
  * axial lines
  */
  _generatePts(nPts) {
    const pts = []
    const segementLength = (Math.min((this._h / 2), this._w / 2)) / nPts
    for (let i = 0; i < nPts; i++) {
      const x = i % 2 ? Math.random() : 0
      const y = segementLength * i + ((Math.random() - 0.5) * segementLength * 5)
      pts.push([x, y])
    }
    return pts
  }

  /**
  * Generates coordinates for axial lines of somewhat varying lengths
  */
  _generateRadialPts() {
    const lineSize = Math.min((this._h / 2), (this._w / 2))
    return [
      [0, Math.random() * (lineSize / 8)],
      [0, lineSize - (Math.random() * (lineSize / 4))]
    ]
  }

  _drawRadialLines(pts0, pts1) {
    const pts = pts0.map((p, i) => {
      return [
        p[0] + ((pts1[i][0] - p[0]) * this._t),
        p[1] + ((pts1[i][1] - p[1]) * this._t),
      ]
    })
    const theta = (Math.PI * 2) / this.complexity
    const colorHelix = cubehelix(this.color1)
    colorHelix.l = colorHelix.l + (Math.sin(this._t * Math.PI * 2) * 0.1)
    const displayColor = colorHelix.toString()
    for (let i = 0; i < this.complexity; i++) {
      this._ctx.beginPath()
      const coord0 = this._rotateCoords(theta * i, pts[0][0], pts[0][1])
      const coord1 = this._rotateCoords(theta * i, pts[1][0], pts[1][1])
      this._ctx.moveTo(coord0[0], coord0[1])
      this._ctx.lineTo(coord1[0], coord1[1])
      this._ctx.lineWidth = 1
      this._ctx.strokeStyle = displayColor
      this._ctx.stroke()
    }
  }

  _drawRadialCurves(pts0, pts1, color) {
    const ptsTween = pts0.map((p, i) => {
      return [
        (p[0] + ((pts1[i][0] - p[0]) * this._t)) * this.amplitude,
        p[1] + ((pts1[i][1] - p[1]) * this._t),
      ]
    })
    const curveLine = line()
      .x(d => d[0])
      .y(d => d[1])
      .curve(curveBasis)
      .context(this._ctx)
    const theta = (Math.PI * 2) / this.complexity
    const colorHelix = cubehelix(color)
    // varies the lightness of the color to create a slight color animation
    colorHelix.l = colorHelix.l + (Math.sin(this._t * Math.PI * 2) * 0.1)
    const displayColor = colorHelix.toString()
    for (let i = 0; i < this.complexity; i++) {
      this._ctx.beginPath()
      const ptsA = ptsTween.map(p => this._rotateCoords(theta * i, p[0], p[1]))
      const ptsB = ptsTween.map(p => this._rotateCoords(theta * i, -p[0], p[1]))
      curveLine(ptsA)
      curveLine(ptsB)
      this._ctx.lineWidth = 1.5
      this._ctx.strokeStyle = displayColor
      this._ctx.stroke()
    }
  }

  _rotateCoords(theta, x0, y0, cx = 0, cy = 0) {
    const x1 = (Math.cos(theta) * (x0 - cx)) + (Math.sin(theta) * (y0 - cy)) + cx
    const y1 = (Math.cos(theta) * (y0 - cy)) - (Math.sin(theta) * (x0 - cx)) + cy
    return [x1, y1]
  }

}

new GraphicGenerator()
