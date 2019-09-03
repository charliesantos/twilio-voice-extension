(function() {

  let deviceView;
  let deviceSetupEl;

  class DeviceView {
    constructor(tokenUrlEl) {
      this.tokenUrlEl = tokenUrlEl;
    }
  
    setupDevice(onReady) {
      this.log('INFO', 'Setting up device');
      getJson(this.tokenUrlEl.value, (err, data) => {
        if (err) {
          return this.log('ERROR', err);
        }
        this.identity = data.identity;
        this.device = new Twilio.Device(data.token, {
          debug: true
        });
        this.setIdentityUI();
        this.setupHandlers(onReady);
      });
    }
  
    setupHandlers(onReady) {
      this.device.on('ready', () => {
        this.log('INFO', 'Device ready');
        this.showHideButtons('Call');

        deviceSetupEl.style.display = 'none';

        onReady && onReady(this);
      });
  
      this.device.on('error', (error) => this.log('ERROR', `${error.message} (${error.code})`));
  
      this.device.on('connect', (connection) => {
        this.log('INFO', 'Connection established');
        this.connection = connection;
        this.setCallSidUI(connection);
      });
  
      this.device.on('disconnect', () => {
        this.log('INFO', 'Call disconnected');
        this.showHideButtons('Call');
        this.device.disconnectAll();
      });
  
      this.device.on('cancel', () => {
        this.log('INFO', 'Call cancelled');
        this.showHideButtons('Call');
      });
  
      this.device.on('offline', () => {
        this.log('INFO', 'Device offline');
      });
  
      this.device.on('incoming', (connection) => {
        this.log('INFO', 'Incoming connection from ' + connection.parameters.From);
        this.connection = connection;
        this.setCallSidUI(connection);
  
        this.showHideButtons(['Accept', 'Reject', 'Ignore']);
      });
    }
  
    showHideButtons(buttonsToShow) {
      if (!Array.isArray(buttonsToShow)) {
        buttonsToShow = [buttonsToShow];
      }
      const buttonsToShowHash = {};
      buttonsToShow.forEach((name) => {
        buttonsToShowHash[name] = true;
      });
      this.buttonData.forEach((data) => {
        if (buttonsToShowHash[data.value]) {
          data.el.style.display = 'inline-block';
        } else {
          data.el.style.display = 'none';
        }
      });
    }
  
    log(type, msg) {
      const p = document.createElement('p');
      p.innerText = `${type}: ${msg}`;
      this.logEl.appendChild(p);
  
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    callNumber() {
      this.log('INFO', 'Calling ' + this.numberEl.value);
      this.showHideButtons('Hangup');
      this.device.connect({
        To: this.numberEl.value
      });
    }
  
    onCallClick() {
      if (!this.device) {
        this.setupDevice(() => this.callNumber());
      } else {
        this.callNumber();
      }
    }
  
    onHangupClick() {
      this.log('INFO', 'Hanging up');
      this.device.disconnectAll();
    }
  
    onAcceptClick() {
      this.log('INFO', 'Accepting call');
      this.connection.accept();
      this.showHideButtons('Hangup');
    }
  
    onRejectClick() {
      this.log('INFO', 'Rejecting call');
      this.connection.reject();
      this.showHideButtons('Call');
    }
  
    onIgnoreClick() {
      this.log('INFO', 'Ignoring call');
      this.connection.ignore();
      this.showHideButtons('Call');
    }
  
    setIdentityUI() {
      const div = document.createElement('div');
      div.classList.add('label');
      div.innerText = 'Identity: ' + this.identity;
      this.deviceEl.prepend(div);
    }
  
    setCallSidUI(connection) {
      this.callSidEl.innerText = 'Call SID: ' + connection.mediaStream.callSid;
    }
  
    render() {
      this.deviceEl = document.createElement('div');
      this.deviceEl.classList.add('device');
  
      this.callSidEl = document.createElement('div');
      this.callSidEl.classList.add('label');
      this.callSidEl.innerText = 'Call SID:'
      this.deviceEl.appendChild(this.callSidEl);
  
      this.numberEl = document.createElement('input');
      this.numberEl.classList.add('textbox');
      this.numberEl.setAttribute('type', 'text');
      this.numberEl.setAttribute('placeholder', 'Phone Number');
      getTextBoxValue('number', (value) => {
        this.numberEl.value =  value;
      });
      this.numberEl.onchange = () => saveTextBoxValue('number', this.numberEl.value);
      this.deviceEl.appendChild(this.numberEl);
  
      const buttonsWrapper = document.createElement('div');
      buttonsWrapper.classList.add('buttons');
      this.buttonData = [{
        className: 'call-btn',
        value: 'Call',
        onClick: () => this.onCallClick()
      },{
        className: 'hangup-btn',
        value: 'Hangup',
        onClick: () => this.onHangupClick()
      },{
        className: 'accept-btn',
        value: 'Accept',
        onClick: () => this.onAcceptClick()
      },{
        className: 'reject-btn',
        value: 'Reject',
        onClick: () => this.onRejectClick()
      },{
        className: 'ignore-btn',
        value: 'Ignore',
        onClick: () => this.onIgnoreClick()
      }];
      
      this.buttonData.forEach((btnData) => {
        const btnEl = document.createElement('input');
        btnEl.classList.add(btnData.className);
        btnEl.setAttribute('type', 'button');
        btnEl.setAttribute('value', btnData.value);
  
        btnEl.onclick = btnData.onClick;
        btnEl.style.display = 'none';
  
        btnData.el = btnEl;
        buttonsWrapper.appendChild(btnData.el);
      });
      this.deviceEl.appendChild(buttonsWrapper);
  
      this.logEl = document.createElement('div');
      this.logEl.classList.add('log');
      this.deviceEl.appendChild(this.logEl);
  
      return this.deviceEl;
    }
  }
  
  function getJson(url, callback) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      const errMsg = 'Cannot get token from the url provided';
      if (this.readyState == 4 && this.status == 200) {
        try {
          callback(null, JSON.parse(this.responseText));
        } catch {
          callback(errMsg);  
        }
      }
    };
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  }

  function saveTextBoxValue(key, value) {
    const item = {};
    item[key] = value;
    chrome.storage.sync.set(item);
  }

  function getTextBoxValue(key, cb) {
    chrome.storage.sync.get([key], (items) => {
      cb(items[key] || '');
    });
  }

  addEventListener('load', () => {
    deviceSetupEl = document.getElementById('setup-device');
    deviceSetupEl.onclick = () => {
      if (deviceView) {
        deviceView.setupDevice();
      }
    };

    const tokenUrlEl = document.getElementById('token-url');
    getTextBoxValue('tokenUrl', (value) => {
      tokenUrlEl.value = value;
    });
    tokenUrlEl.onchange = () => saveTextBoxValue('tokenUrl', tokenUrlEl.value);

    deviceView = new DeviceView(tokenUrlEl);
    root.appendChild(deviceView.render());

    deviceView.showHideButtons('Call');
    deviceView.log('INFO', 'App rendered.');

    // For debugging in the console
    window.deviceView = deviceView;
  });
})();
  