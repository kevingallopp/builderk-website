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
    coveredExterior: {
      name: 'Covered outdoor space',
      ratePerSqft: 120,
      defaultSqft: 150
    },
    garageRatePerSqft: 120,
    garages: {
      0: { name: 'No garage', sqft: 0 },
      2: { name: 'Two car garage', sqft: 440 },
      3: { name: 'Three car garage', sqft: 640 }
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
    var garageSqft = options.garageSqft == null ? garage.sqft : Math.max(Number(options.garageSqft) || 0, 0);
    var coveredExteriorSqft = options.coveredExteriorSqft == null
      ? pricing.coveredExterior.defaultSqft
      : Math.max(Number(options.coveredExteriorSqft) || 0, 0);
    var livingLow = sqft * tier.low;
    var livingHigh = sqft * tier.high;
    var garageCost = garageSqft * pricing.garageRatePerSqft;
    var coveredExteriorCost = coveredExteriorSqft * pricing.coveredExterior.ratePerSqft;
    var complexityLow = livingLow * complexity.percent;
    var complexityHigh = livingHigh * complexity.percent;
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
      garageSqft: garageSqft,
      garageLow: garageCost,
      garageHigh: garageCost,
      coveredExteriorSqft: coveredExteriorSqft,
      coveredExteriorLow: coveredExteriorCost,
      coveredExteriorHigh: coveredExteriorCost,
      complexityLow: complexityLow,
      complexityHigh: complexityHigh,
      extrasLow: extrasLow,
      extrasHigh: extrasHigh,
      totalLow: livingLow + garageCost + coveredExteriorCost + complexityLow + extrasLow,
      totalHigh: livingHigh + garageCost + coveredExteriorCost + complexityHigh + extrasHigh
    };
  };

  window.BuilderKPricing = pricing;
})(window);
