(async () => {
  const args = process.argv.slice(2);
  const epochStartHeight = parseInt(args[0]);
  const showErrors = args[1] === 'true';
  const arnsContractTxId = 'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';
  const epochEndHeight = epochStartHeight + 720 - 1;
  const epochDistributionHeight = epochEndHeight + 15;
  const epochPeriod = Math.floor((epochStartHeight - 1350700) / 720);
  const url = `https://api.arns.app/v1/contract/${arnsContractTxId}`;
  const prescribedObserversForEpoch = (
    (await fetch(`${url}?blockHeight=${epochEndHeight}`).then(
      async (res) => await res.json(),
    )) as any
  ).state.prescribedObservers[epochStartHeight];
  const [before, after] = await Promise.all(
    [epochDistributionHeight - 1, epochDistributionHeight + 14].map(
      async (height) => {
        return fetch(`${url}?blockHeight=${height}`).then(
          async (res) => (await res.json()) as { state: any },
        );
      },
    ),
  );

  const protocolBalanceBefore = before.state.balances[arnsContractTxId];
  const protocolBalanceAfter = after.state.balances[arnsContractTxId];
  const eligibleForDistribution = protocolBalanceBefore * 0.0025;
  const protocolBalanceDiff = protocolBalanceBefore - protocolBalanceAfter;

  const eligibleGateways = Object.keys(before.state.gateways).filter(
    (gateway) => before.state.gateways[gateway].start <= epochStartHeight,
  );
  const newGateways = Object.keys(after.state.gateways).filter(
    (gateway) => before.state.gateways[gateway].start > epochStartHeight,
  );
  const totalGatewayRewards = eligibleForDistribution * 0.95;
  const perGatewayRewards = Math.floor(
    totalGatewayRewards / eligibleGateways.length,
  );

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
  const perObserverRewards = Math.floor(
    totalObserverRewards / expectedObservationCount,
  );

  const prescribedObservers = prescribedObserversForEpoch.map(
    (observer: { gatewayAddress: string }) => observer.gatewayAddress,
  );

  let gatewayFailedCount = 0;
  let totalPenalizedObservers = 0;
  let totalRewardedGateways = 0;
  let totalRewardedObservers = 0;
  let totalNoRewards = 0;
  let totalDistributedRewards = 0;
  const failedObservers: string[] = [];
  const failedGateways: string[] = [];
  const balanceChecks = eligibleGateways.map((address) => {
    let expectedReward = 0;
    const gateway = after.state.gateways[address];
    const failureCounts = failureSummariesForEpoch[address]?.length || 0;
    const minimumFailureCount = totalSubmittedObservations * 0.5;
    const didGatewayPass = failureCounts <= minimumFailureCount;
    const wasPrescribed = prescribedObservers.includes(address);
    const didObserve = observersForEpoch.includes(gateway.observerWallet);

    if (!didGatewayPass) {
      gatewayFailedCount++;
      failedGateways.push(address);
    }

    if (wasPrescribed && !didObserve) {
      failedObservers.push(address);
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
      totalRewardedGateways++;
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
      Math.round(balanceDiff) === Math.floor(expectedReward);

    // increment our total
    totalDistributedRewards += Math.floor(expectedReward);
    return [
      gateway,
      balanceUpdatedCorrectly,
      {
        address,
        balanceBefore,
        gatewayBalanceAfter,
        balanceDiff: Math.round(balanceDiff),
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
  console.log(`Epoch period: ${epochPeriod}`);
  console.log(`Epoch distribution height: ${epochDistributionHeight}`);
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
  console.log(`Total eligible gateways for epoch: ${eligibleGateways.length}`);
  console.log(
    `Total eligible gateways passed: ${
      eligibleGateways.length - gatewayFailedCount
    }`,
  );
  console.log(`Total eligible gateways failed: ${gatewayFailedCount}`);
  console.log(
    `Total eligible gateways passed %: ${
      ((eligibleGateways.length - gatewayFailedCount) /
        eligibleGateways.length) *
      100
    }%`,
  );
  console.log(`Total eligible gateway rewards: ${totalGatewayRewards}`);
  console.log(`Total per gateway reward: ${perGatewayRewards}`);
  console.log(`Total new gateways during epoch: ${newGateways.length}`);

  console.log('\n****OBSERVATIONS*****');
  console.log(`Expected observation count: ${expectedObservationCount}`);
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
    }%`,
  );
  console.log('Gateways failed to observe:\n');

  const failureReasons = await Promise.all(
    failedObservers.map(async (address) => {
      let failureReasonsForGateway = [];
      const { result } = (await fetch(`${url}/state/gateways/${address}`).then(
        async (res) => await res.json(),
      )) as { result: any };
      const {
        settings: { port, protocol, fqdn },
        observerWallet,
      } = result;
      const constructedURL = `${protocol}://${fqdn}:${port}`;
      const { wallet: fetchedObserverWallet } = (await fetch(
        `${constructedURL}/ar-io/observer/info`,
      )
        .then(async (res) => await res.json())
        .catch(() => {
          failureReasonsForGateway.push(
            'Observer not running and/or unable to connect',
          );
          return { wallet: undefined };
        })) as { wallet: string | undefined };

      if (fetchedObserverWallet && fetchedObserverWallet !== observerWallet) {
        const gateway = before.state.gateways[address];
        const gatewayURL = `${gateway.settings.protocol}://${gateway.settings.fqdn}:${gateway.settings.port}`;
        failureReasonsForGateway.push(
          `Observer wallet @ ${gatewayURL}/ar-io/observer/info (${fetchedObserverWallet}) does not match the 'observerWallet' set on the gateway (${observerWallet}) @ ${url}/state/gateways/${address}`,
        );
      }

      const balance = await fetch(
        `https://arweave.net/wallet/${address}/balance`,
      )
        .then(async (res) => await res.json())
        .catch(() => 0);
      if (balance === 0) {
        failureReasonsForGateway.push('Observer wallet has no AR');
      }
      return `${address} - ${
        failureReasonsForGateway.join(', ') ||
        'Uncertain - confirm your OBSERVER_WALLET is set in the `.env` file and corresponding wallet is located in wallets/<address>.json. Once confirmed, restart observer with `sudo docker-compose restart observer`'
      }`;
    }),
  );
  console.log(failureReasons.join('\n'));

  console.log('\n****BALANCES*****');
  console.log(`Observers balances updated correctly: ${balancesMatchExpected}`);
  console.log(`Gateway balances updated correctly: ${balancesMatchExpected}`);
  console.log(`Total distributed rewards: ${totalDistributedRewards}`);
  console.log('Total rewarded gateways: ', totalRewardedGateways);
  console.log('Total rewarded observers: ', totalRewardedObservers);
  console.log(
    'Total observers receiving partial reward: ',
    totalPenalizedObservers,
  );
  console.log('Total gateways that received no reward: ', totalNoRewards);

  if (showErrors) {
    console.log('\n****ERRORS*****');
    const totalErrors = balanceChecks.filter(([_, correct]) => !correct).length;
    if (totalErrors > 0) {
      balanceChecks.forEach(([_, balanceUpdatedCorrectly, diff]) => {
        if (!balanceUpdatedCorrectly) {
          console.log(diff);
        }
      });
    } else {
      console.log('NONE!');
    }
  }
})();
