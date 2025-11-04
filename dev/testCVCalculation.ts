/**
 * Test: Coefficient of Variation (CV) Calculation
 * Verifies CV = (stdDev / avg) * 100 is calculated correctly
 */

import { calculateStats } from '../services/monthlyCalculations';

function testCVCalculation() {
  console.log('\n🧪 TEST: Coefficient of Variation (CV) Calculation\n');
  console.log('='.repeat(80));

  // Test 1: Normal case with variation
  console.log('\n📊 Test 1: Normal case with variation');
  const values1 = [1000, 1200, 800, 1100, 900];
  const stats1 = calculateStats(values1);
  
  console.log(`   Values: [${values1.join(', ')}]`);
  console.log(`   Sum: ${stats1.sum}`);
  console.log(`   Avg: ${stats1.avg}`);
  console.log(`   Variance: ${stats1.variance.toFixed(2)}`);
  console.log(`   StdDev: ${Math.sqrt(stats1.variance).toFixed(2)}`);
  console.log(`   CV: ${stats1.cv?.toFixed(1)}%`);
  
  // Expected: avg = 1000, stdDev ≈ 141.42, CV ≈ 14.1%
  const expectedAvg1 = 1000;
  const expectedStdDev1 = 141.42;
  const expectedCV1 = 14.1;
  
  const test1Pass = 
    Math.abs(stats1.avg - expectedAvg1) < 1 &&
    Math.abs(Math.sqrt(stats1.variance) - expectedStdDev1) < 1 &&
    stats1.cv !== null &&
    Math.abs(stats1.cv - expectedCV1) < 0.5;
  
  console.log(`   ${test1Pass ? '✓' : '✗'} CV calculation correct`);

  // Test 2: No variation (all values same)
  console.log('\n📊 Test 2: No variation (all values same)');
  const values2 = [5000, 5000, 5000, 5000];
  const stats2 = calculateStats(values2);
  
  console.log(`   Values: [${values2.join(', ')}]`);
  console.log(`   Avg: ${stats2.avg}`);
  console.log(`   StdDev: ${Math.sqrt(stats2.variance).toFixed(2)}`);
  console.log(`   CV: ${stats2.cv !== null ? stats2.cv.toFixed(1) + '%' : 'null'}`);
  
  // Expected: CV = 0% (no variation)
  const test2Pass = stats2.cv === 0;
  console.log(`   ${test2Pass ? '✓' : '✗'} CV is 0% when no variation`);

  // Test 3: Zero average (edge case)
  console.log('\n📊 Test 3: Zero average (edge case)');
  const values3 = [0, 0, 0, 0];
  const stats3 = calculateStats(values3);
  
  console.log(`   Values: [${values3.join(', ')}]`);
  console.log(`   Avg: ${stats3.avg}`);
  console.log(`   CV: ${stats3.cv !== null ? stats3.cv.toFixed(1) + '%' : 'null'}`);
  
  // Expected: CV = null (cannot divide by zero)
  const test3Pass = stats3.cv === null;
  console.log(`   ${test3Pass ? '✓' : '✗'} CV is null when avg = 0`);

  // Test 4: Exclude current month index
  console.log('\n📊 Test 4: Exclude current month from calculation');
  const values4 = [1000, 1000, 1000, 5000]; // Last one is current month (outlier)
  const statsWithout = calculateStats(values4);
  const statsWith = calculateStats(values4, [3]); // Exclude index 3
  
  console.log(`   Values: [${values4.join(', ')}] (index 3 is current month)`);
  console.log(`   Without exclusion: avg=${statsWithout.avg}, CV=${statsWithout.cv?.toFixed(1)}%`);
  console.log(`   With exclusion [3]: avg=${statsWith.avg}, CV=${statsWith.cv?.toFixed(1)}%`);
  
  // Expected: excluding index 3 → avg=1000, cv=0%
  const test4Pass = 
    statsWith.avg === 1000 &&
    statsWith.cv === 0;
  
  console.log(`   ${test4Pass ? '✓' : '✗'} Exclusion works and CV recalculated correctly`);

  // Test 5: High vs Low variation
  console.log('\n📊 Test 5: Compare high vs low variation scenarios');
  
  const lowVar = [950, 1000, 1050]; // Low variation
  const highVar = [500, 1000, 1500]; // High variation (same avg)
  
  const statsLow = calculateStats(lowVar);
  const statsHigh = calculateStats(highVar);
  
  console.log(`   Low variation: avg=${statsLow.avg.toFixed(0)}, CV=${statsLow.cv?.toFixed(1)}%`);
  console.log(`   High variation: avg=${statsHigh.avg.toFixed(0)}, CV=${statsHigh.cv?.toFixed(1)}%`);
  
  // High variation should have higher CV
  const test5Pass = 
    statsHigh.cv !== null &&
    statsLow.cv !== null &&
    statsHigh.cv > statsLow.cv;
  
  console.log(`   ${test5Pass ? '✓' : '✗'} High variation has higher CV than low variation`);

  // Test 6: Negative values (absolute value used in CV)
  console.log('\n📊 Test 6: Negative values (expenses)');
  const negValues = [-1000, -1200, -800];
  const statsNeg = calculateStats(negValues);
  
  console.log(`   Values: [${negValues.join(', ')}]`);
  console.log(`   Avg: ${statsNeg.avg.toFixed(0)}`);
  console.log(`   CV: ${statsNeg.cv?.toFixed(1)}%`);
  
  // CV should use absolute value of average to avoid negative CV
  const test6Pass = statsNeg.cv !== null && statsNeg.cv > 0;
  console.log(`   ${test6Pass ? '✓' : '✗'} CV is positive even with negative values`);

  // Overall result
  const allTests = [test1Pass, test2Pass, test3Pass, test4Pass, test5Pass, test6Pass];
  const passedCount = allTests.filter(Boolean).length;
  const allPassed = passedCount === allTests.length;

  console.log('\n' + '='.repeat(80));
  console.log(`🏁 TEST SUMMARY: ${passedCount}/${allTests.length} tests passed`);
  console.log(allPassed ? '✅ PASS: CV calculation works correctly' : '❌ FAIL: Some tests failed');
  console.log('='.repeat(80) + '\n');
}

// Run test
testCVCalculation();

