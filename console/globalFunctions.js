// This file should be added to public folder and loaded in index.html
// It exposes necessary functions from app.js to the window object

// Minimal getFormValues function for compatibility
window.getFormValues = function () {
  // This will be overridden by React components
  return {
    region: 'us-west-2',
    channelName: '',
    clientId: '',
    sendVideo: false,
    sendAudio: false,
    openDataChannel: false,
    widescreen: true,
    fullscreen: false,
    useTrickleICE: true,
    natTraversalDisabled: false,
    forceSTUN: false,
    forceTURN: false,
    accessKeyId: '',
    endpoint: null,
    secretAccessKey: '',
    sessionToken: null,
    enableDQPmetrics: false,
    enableProfileTimeline: false,
    autoDetermineMediaIngestMode: false,
    sendHostCandidates: true,
    acceptHostCandidates: true,
    sendRelayCandidates: true,
    acceptRelayCandidates: true,
    sendSrflxCandidates: true,
    acceptSrflxCandidates: true,
    sendPrflxCandidates: true,
    acceptPrflxCandidates: true,
    sendTcpCandidates: true,
    acceptTcpCandidates: true,
    sendUdpCandidates: true,
    acceptUdpCandidates: true,
  };
};

// Stub functions that will be used by viewer.js
window.onStatsReport = function (report) {
  console.debug('[STATS]', Object.fromEntries([...report.entries()]));
};

window.printFormValues = function (formValues) {
  const copyOfForm = Object.assign({}, formValues);
  copyOfForm.accessKeyId = copyOfForm.accessKeyId.replace(/./g, '*');
  copyOfForm.secretAccessKey = copyOfForm.secretAccessKey.replace(/./g, '*');
  copyOfForm.sessionToken = copyOfForm.sessionToken?.replace(/./g, '*');
  console.log('[FORM_VALUES] Connecting with the following configuration:', {
    region: copyOfForm.region,
    channelName: copyOfForm.channelName,
    clientId: copyOfForm.clientId,
  });
};

window.shouldAcceptCandidate = function (formValues, candidate) {
  return true;
};

window.shouldSendIceCandidate = function (formValues, candidate) {
  return true;
};

window.printPeerConnectionStateInfo = function (
  event,
  logPrefix,
  remoteClientId
) {
  const rtcPeerConnection = event.target;
  console.debug(
    logPrefix,
    'PeerConnection state:',
    rtcPeerConnection.connectionState
  );
  if (rtcPeerConnection.connectionState === 'connected') {
    console.log(logPrefix, 'Connection to peer successful!');
  } else if (rtcPeerConnection.connectionState === 'failed') {
    console.error(logPrefix, 'Connection failed!');
  }
};

window.getCodecFilters = function () {
  // Return empty arrays to indicate no codec filtering
  return [[], []];
};
