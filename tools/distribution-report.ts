import prescribed from '../results/prescribed.json';

(async () => {
  const arnsContractTxId = 'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';
  const tickHeight = 1354315;
  const epochStartHeight = 1353580;
  const epochEndHeight = epochStartHeight + 720 - 1;
  const url = `https://api.arns.app/v1/contract/${arnsContractTxId}`;
  const [before, after] = await Promise.all(
    [tickHeight - 1, tickHeight].map(async (height) => {
      return fetch(`${url}?blockHeight=${height}`).then(
        async (res) => (await res.json()) as { state: any },
      );
    }),
  );

  const protocolBalanceBefore = before.state.balances[arnsContractTxId];
  const protocolBalanceAfter = after.state.balances[arnsContractTxId];
  const eligibleForDistribution = protocolBalanceBefore * 0.0025;
  const protocolBalanceDiff = protocolBalanceBefore - protocolBalanceAfter;

  const totalGateways = Object.keys(before.state.gateways);
  const totalGatewayRewards = eligibleForDistribution * 0.95;
  const perGatewayRewards = totalGatewayRewards / totalGateways.length;

  const expectedObservationCount = 50;
  const observersForEpoch = Object.keys(
    before.state.observations[epochStartHeight]?.reports || {},
  );
  const failureSummariesForEpoch =
    before.state.observations[epochStartHeight]?.failureSummaries || {};
  const totalSubmittedObservations = observersForEpoch.length;
  const percentOfExpectedObservations =
    (totalSubmittedObservations / expectedObservationCount) * 100;
  const totalObserverRewards = eligibleForDistribution * 0.05;
  const perObserverRewards = totalObserverRewards / expectedObservationCount;

  const prescribedObservers = prescribed.map(
    (observer) => observer.gatewayAddress,
  );

  let gatewayFailedCount = 0;
  let totalPenalizedObservers = 0;
  let totalRewardedGateways = 0;
  let totalRewardedObservers = 0;
  let totalNoRewards = 0;
  const balanceChecks = Object.keys(after.state.gateways).map((address) => {
    let expectedReward = 0;
    const gateway = after.state.gateways[address];
    const failureCounts = failureSummariesForEpoch[address]?.length || 0;
    const minimumFailureCount = totalSubmittedObservations * 0.5;
    const didGatewayPass = failureCounts < minimumFailureCount;
    const wasPrescribed = prescribedObservers.includes(address);
    const didObserve = observersForEpoch.includes(gateway.observerWallet);

    if (!didGatewayPass) {
      gatewayFailedCount++;
    }

    // it did all it's duties - max reward
    if (didGatewayPass && wasPrescribed && didObserve) {
      expectedReward = perObserverRewards + perGatewayRewards;
      totalRewardedObservers++;
      totalRewardedGateways++;
    } else if (wasPrescribed && didObserve && !didGatewayPass) {
      expectedReward = perObserverRewards;
      totalRewardedObservers++;
    } else if (wasPrescribed && didGatewayPass && !didObserve) {
      expectedReward = perGatewayRewards * 0.75;
      totalPenalizedObservers++;
    } else if (didGatewayPass && !wasPrescribed) {
      expectedReward = perGatewayRewards;
      totalRewardedGateways++;
    } else {
      expectedReward = 0;
      totalNoRewards++;
    }

    const balanceBefore = before.state.balances[address] || 0;
    const gatewayBalanceAfter = after.state.balances[address] || 0;
    const balanceDiff = gatewayBalanceAfter - balanceBefore;
    const balanceUpdatedCorrectly =
      Math.floor(balanceDiff) === Math.floor(expectedReward);
    return [
      gateway,
      balanceUpdatedCorrectly,
      {
        address,
        balanceBefore,
        gatewayBalanceAfter,
        balanceDiff: Math.floor(balanceDiff),
        expectedReward: Math.floor(expectedReward),
      },
    ];
  });

  const balancesMatchExpected = balanceChecks.every(
    ([, balanceUpdatedCorrectly]) => balanceUpdatedCorrectly,
  );

  console.log('****SUMMARY*****');
  console.log(`Epoch start height: ${epochStartHeight}`);
  console.log(`Epoch end height: ${epochEndHeight}`);
  console.log(`Distribution ticked height: ${tickHeight}`);
  console.log(`Protocol balance before distribution: ${protocolBalanceBefore}`);
  console.log(`Protocol balance after distribution: ${protocolBalanceAfter}`);
  console.log(
    `Protocol balance eligible for distribution: ${eligibleForDistribution}`,
  );
  console.log(`Total distributed: ${protocolBalanceDiff}`);
  console.log(
    `Total distributed of eligible %: ${
      (protocolBalanceDiff / eligibleForDistribution) * 100
    } %`,
  );

  console.log('\n****GATEWAYS*****');
  console.log(`Total gateways: ${totalGateways.length}`);
  console.log(
    `Total gateways passed: ${totalGateways.length - gatewayFailedCount}`,
  );
  console.log(`Total gateways failed: ${gatewayFailedCount}`);
  console.log(
    `Total gateways passed %: ${
      ((totalGateways.length - gatewayFailedCount) / totalGateways.length) * 100
    }%`,
  );
  console.log(`Total eligible gateway rewards: ${totalGatewayRewards}`);
  console.log(`Total per gateway reward: ${perGatewayRewards}`);

  console.log('\n****OBSERVATIONS*****');
  console.log(`Expected observation count ${expectedObservationCount}`);
  console.log(`Total submitted observations: ${totalSubmittedObservations}`);
  console.log(
    `Total observations submitted %: ${percentOfExpectedObservations} %`,
  );
  console.log(`Total eligible observer rewards: ${totalObserverRewards}`);
  console.log(`Total eligible per observer reward: ${perObserverRewards}`);
  console.log(`Total penalized observers: ${totalPenalizedObservers}`);
  console.log(
    `Total observers penalized %: ${
      (totalPenalizedObservers / expectedObservationCount) * 100
    }`,
  );

  console.log('\n****BALANCES*****');
  console.log(`Observers balances updated correctly: ${balancesMatchExpected}`);
  console.log(`Gateway balances updated correctly: ${balancesMatchExpected}`);
  console.log('Total rewarded gateways: ', totalRewardedGateways);
  console.log('Total rewarded observers: ', totalRewardedObservers);
  console.log(
    'Total observers receiving partial reward: ',
    totalPenalizedObservers,
  );
  console.log('Total gateways that received no reward: ', totalNoRewards);
  console.log('\n****ERRORS*****');
  balanceChecks.forEach(([_, balanceUpdatedCorrectly, diff]) => {
    if (!balanceUpdatedCorrectly) {
      console.log(diff);
    }
  });
})();
