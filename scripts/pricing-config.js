(function (window) {
  'use strict';

  var pricing = {
    lastUpdated: 'July 18, 2026',
    market: 'Central Florida (Orlando metro)',
    tiers: {
      standard: { name: 'Standard', low: 160, high: 180, label: '$160 to $180 / sq ft' },
      midrange: { name: 'Midrange', low: 180, high: 220, label: '$180 to $220 / sq ft' },
      luxury: { name: 'Luxury', low: 220, high: 280, label: '$220 to $280+ / sq ft' }
    },
    coveredExteriorAllowance: {
      label: 'Covered exterior allowance (150 sq ft)',
      low: 18000,
      high: 18000
    },
    garages: {
      0: { name: 'No garage', low: 0, high: 0 },
      2: { name: 'two car garage allowance', low: 41800, high: 41800 },
      3: { name: 'three car garage allowance', low: 60800, high: 60800 }
    },
    complexity: {
      simple: { name: 'Simple', percent: 0 },
      typical: { name: 'Typical', percent: 0.05 },
      complex: { name: 'Complex', percent: 0.10 }
    },
    extras: {
      pool: { name: 'Pool', low: 55000, high: 95000 },
      pavers: { name: 'Paver driveway / patio', low: 8000, high: 22000 },
      metalRoof: { name: 'Metal roof upgrade', low: 14000, high: 32000 }
    },
    mortgageExample: {
      rate: 6.55,
      termYears: 30,
      sourceName: 'Freddie Mac PMMS',
      sourceDate: 'July 16, 2026',
      sourceUrl: 'https://www.freddiemac.com/pmms'
    }
  };

  pricing.calculate = function (options) {
    var sqft = Number(options.sqft) || 0;
    var tier = pricing.tiers[options.tier] || pricing.tiers.standard;
    var garage = pricing.garages[options.garage] || pricing.garages[0];
    var complexity = pricing.complexity[options.complexity] || pricing.complexity.typical;
    var selectedExtras = options.extras || {};
    var livingLow = sqft * tier.low;
    var livingHigh = sqft * tier.high;
    var subtotalLow = livingLow + pricing.coveredExteriorAllowance.low + garage.low;
    var subtotalHigh = livingHigh + pricing.coveredExteriorAllowance.high + garage.high;
    var complexityLow = subtotalLow * complexity.percent;
    var complexityHigh = subtotalHigh * complexity.percent;
    var extrasLow = 0;
    var extrasHigh = 0;

    Object.keys(selectedExtras).forEach(function (key) {
      if (selectedExtras[key] && pricing.extras[key]) {
        extrasLow += pricing.extras[key].low;
        extrasHigh += pricing.extras[key].high;
      }
    });

    return {
      tier: tier,
      livingLow: livingLow,
      livingHigh: livingHigh,
      garageLow: garage.low,
      garageHigh: garage.high,
      complexityLow: complexityLow,
      complexityHigh: complexityHigh,
      extrasLow: extrasLow,
      extrasHigh: extrasHigh,
      totalLow: subtotalLow + complexityLow + extrasLow,
      totalHigh: subtotalHigh + complexityHigh + extrasHigh
    };
  };

  window.BuilderKPricing = pricing;
})(window);
