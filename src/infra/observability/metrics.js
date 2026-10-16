let rates = {}
let errors = {}
let durations = {}

export const metrics = {
  incrementRate(route, method) {
    const key = `${method} ${route}`
    // const key = method + ' ' + route

    rates[key] = (rates[key] ?? 0) + 1
  },
  
  incrementErrors(route, method, statusCode) {
    const key = `${method} ${route}`
    // const key = method + ' ' + route

    errors[key] = (errors[key] ?? 0) + 1
  },

  recordDuration(route, method, durationMs) {
    const key = `${method} ${route}`
    // const key = method + ' ' + route

    if (!durations[key]) {
      durations[key] = []
    }

    durations[key].push(durationMs)
  },

  getMetrics() {
    return {
      rates: { ...rates },
      errors: { ...errors },
      durations: { ...durations }
    }
  },

  resetMetrics() {
    rates = {}
    errors = {}
    durations = {}
  }
}
