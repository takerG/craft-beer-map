export function buildTrace(cases, variant, traceSource = 'synthetic') {
  return {
    traceSource,
    experimentId: 'ai-rec-quality-v2-20260612',
    experimentBuildId: 'build-1',
    sourceTreeFingerprint: 'sha256:source',
    catalogFingerprint: 'sha256:catalog',
    variant,
    recommendationContract: variant === 'candidate' ? 'semantic-v2' : 'legacy-v1',
    capturedAt: new Date().toISOString(),
    cases: cases.map((fixture) => buildCase(fixture, variant)),
  };
}

function buildCase(fixture, variant) {
  const expected = fixture.expectedByVariant[variant];
  const calls = [];
  const turns = [
    { turnId: `${fixture.id}-U1`, role: 'user', content: fixture.prompt },
    { turnId: `${fixture.id}-A1`, role: 'assistant', content: `${fixture.id} 已处理。` },
  ];
  if (expected.api !== 'knowledge') {
    if (variant === 'candidate' && isTerminalApi(expected.api)) {
      calls.push(successfulRecommendation('start'));
    }
    calls.push(...expectedCalls(expected, variant));
  }
  if (expected.multiTurn) {
    turns.push(
      { turnId: `${fixture.id}-U2`, role: 'user', content: '继续调整上一轮偏好。' },
      { turnId: `${fixture.id}-A2`, role: 'assistant', content: `${fixture.id} 已完成调整。` },
    );
  }
  const started = calls.some((call) =>
    call.name === 'recommendBeerStyles' && !call.result.isError);
  const shown = started;
  const terminalSucceeded = calls.some((call) =>
    isTerminalApi(call.name) && !call.result.isError);
  const cardActions = shown
    ? [{ type: 'recommendation-shown', status: 'success' }]
    : [];
  if (shown && terminalSucceeded) {
    cardActions.push({
      type: expected.api === 'addFavoriteBeerStyle' ? 'favorite-added' : 'detail-opened',
      status: 'success',
    });
  }
  return {
    caseId: fixture.id,
    testerCode: variant === 'candidate' ? 'T-041' : 'T-001',
    turns,
    assistantOutputs: turns
      .filter((turn) => turn.role === 'assistant')
      .map(({ turnId, content }) => ({ turnId, content })),
    apiCalls: calls,
    cardActions,
    started,
    shown,
    completed: cardActions.some((action) =>
      ['favorite-added', 'detail-opened'].includes(action.type)),
  };
}

function expectedCalls(expected, variant) {
  if (variant !== 'candidate') return [successCall(expected.api, variant)];
  if (expected.multiTurn) {
    return [successfulRecommendation('start'), successfulRecommendation('continue')];
  }
  const failure = expected.staleRejected
    ? 'stale-revision'
    : expected.expired
      ? 'expired-flow'
      : expected.duplicate
        ? 'duplicate-request'
        : null;
  if (expected.recover) {
    return [failedCall(expected.api, 'invalid-input'), successCall(expected.api, variant, expected)];
  }
  if (expected.restarted) {
    return [failedCall(expected.api, 'unknown-flow'), successfulRecommendation('start', expected)];
  }
  if (failure) return [failedCall(expected.api, failure)];
  return [successCall(expected.api, variant, expected)];
}

function successCall(name, variant, expected = {}) {
  if (name === 'recommendBeerStyles' && variant === 'candidate') {
    return successfulRecommendation('start', expected);
  }
  return {
    name,
    arguments: isTerminalApi(name)
      ? {
          styleRef: { kind: 'bjcp', id: '1A' },
          recommendationContext: {
            flowId: 'arf_1234567890ab',
            expectedRevision: 0,
            requestId: 'req_1234567890',
          },
        }
      : {},
    result: { isError: false, structuredContent: {} },
  };
}

function successfulRecommendation(mode, expected = {}) {
  const status = expected.state || (expected.relaxationCount ? 'conflict' : 'recommended');
  return {
    name: 'recommendBeerStyles',
    arguments: {
      scenario: 'easy',
      preferences: {
        sweetness: 'unspecified',
        sourness: 'unspecified',
        bitterness: 'low',
        body: 'unspecified',
        strength: 'neutral',
      },
      flow: mode === 'start'
        ? { mode: 'start', requestId: 'req_1234567890' }
        : {
            mode: 'continue',
            flowId: 'arf_1234567890ab',
            expectedRevision: 0,
            requestId: 'req_0987654321',
          },
    },
    result: {
      isError: false,
      structuredContent: {
        contract: 'semantic-v2',
        status,
        flow: { flowId: 'arf_1234567890ab', revision: mode === 'start' ? 0 : 1 },
        items: status === 'recommended' ? [{ styleRef: { kind: 'bjcp', id: '1A' } }] : [],
        relaxation: expected.relaxationCount
          ? { dimensions: Array.from({ length: expected.relaxationCount }, () => 'bitterness') }
          : null,
      },
    },
  };
}

function failedCall(name, failureCode) {
  return {
    name,
    arguments: name === 'recommendBeerStyles'
      ? successfulRecommendation('continue').arguments
      : {},
    result: { isError: true, _meta: { failureCode } },
  };
}

function isTerminalApi(name) {
  return ['getBeerStyleDetail', 'addFavoriteBeerStyle'].includes(name);
}
