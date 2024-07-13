import render from './render.js'

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default {
  render,
  sleep
}
