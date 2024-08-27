const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const webSocket = new WebSocket('ws://localhost:3000');

let localStream;
let peerConnection;

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' } // STUN server
  ]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;
  })
  .catch(error => {
    console.error('Error accessing media devices.', error);
  });

webSocket.onmessage = async (message) => {
  const data = JSON.parse(message.data);

  if (data.type === 'offer') {
    await createAnswer(data.offer);
  } else if (data.type === 'answer') {
    await addAnswer(data.answer);
  } else if (data.type === 'ice-candidate') {
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }
};

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      webSocket.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });
}

async function createOffer() {
  createPeerConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  webSocket.send(JSON.stringify({ type: 'offer', offer: offer }));
}

async function createAnswer(offer) {
  createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  webSocket.send(JSON.stringify({ type: 'answer', answer: answer }));
}

async function addAnswer(answer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

// Create offer when the user starts the connection
webSocket.onopen = () => {
  createOffer();
};
