var regions = '${settings.regions}'.split(','), masterNodesString = "", createClusterCommand = "", resp, envInfo, announceIp, first
    getAnnounceIpCommand = "cat /etc/redis.conf|grep ^cluster-announce-ip|tail -n 1|awk '{print $2}'",
    rebalanceCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); redis-cli --cluster check 127.0.0.1:6379 || redis-cli --cluster fix 127.0.0.1:6379; redis-cli --cluster rebalance 127.0.0.1:6379"
    targetMasterIdCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); redis-cli cluster nodes|grep myself|awk '{print $1}'";    
for (var cluster = 1, n = regions.length + 1; cluster < n; cluster++) {
    envInfo = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-' + cluster, session);
    if (envInfo.result != 0) {
        return envInfo;
    }
    envInfo.nodes.sort((node1, node2) => node1.id - node2.id);
    var resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + cluster, session, envInfo.nodes[0].id, toJSON([{"command": getAnnounceIpCommand, "params": ""}]), false, "root");
    if (resp.result != 0) { return resp; }
    announceIp = resp.responses[0].out
    masterNodesString = masterNodesString + announceIp + ":6379 "
}
envInfo = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-1', session);
envInfo.nodes.sort((node1, node2) => node1.id - node2.id);
if (envInfo.result != 0) { return envInfo; }
createClusterCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); yes yes | redis-cli --cluster create  " + masterNodesString + " --cluster-replicas 0";
resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-1', session, envInfo.nodes[0].id, toJSON([{"command": createClusterCommand, "params": ""}]), false, "root");
if (resp.result != 0) { return resp; }

for (var cluster = 1, n = regions.length + 1; cluster < n; cluster++) {
    var resp = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-' + cluster, session);
    if (resp.result != 0) {
        return resp;
    }
    resp.nodes.sort((node1, node2) => node1.id - node2.id);
    for (var i = 1, k = resp.nodes; i < k.length; i++) {
        if (k[i].nodeGroup == 'nosqldb') {
            var resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + cluster, session, k[i].id, toJSON([{"command": getAnnounceIpCommand, "params": ""}]), false, "root");
            if (resp.result != 0) { return resp; }
            announceIp = resp.responses[0].out
            var meetCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); redis-cli -h 127.0.0.1 cluster meet " + announceIp + " 6379; sleep 15";
            resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + cluster, session, k[0].id, toJSON([{"command": meetCommand, "params": ""}]), false, "root");
            if (resp.result != 0) { return resp; }
        }
    }
}

for (var i = 1; i < 3; i++ ) {
  for (var cluster = 1, n = regions.length + 1; cluster < n; cluster++) {
    envInfo = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-' + cluster, session);
    if (envInfo.result != 0) {
        return envInfo;
    }
    envInfo.nodes.sort((node1, node2) => node1.id - node2.id);
    resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + cluster, session, envInfo.nodes[0].id, toJSON([{"command": targetMasterIdCommand, "params": ""}]), false, "root");
    if (resp.result != 0) { return resp; }
    var targetMasterId = resp.responses[0].out;
    
    slave = cluster + i;
    if ( slave > 3 ) {
        slave = slave - 3;
    }
    
    slaveEnvInfo = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-' + slave, session);
    if (slaveEnvInfo.result != 0) {
        return slaveEnvInfo;
    }
    slaveEnvInfo.nodes.sort((node1, node2) => node1.id - node2.id);
    var resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + slave, session, slaveEnvInfo.nodes[i].id, toJSON([{"command": getAnnounceIpCommand, "params": ""}]), false, "root");
    if (resp.result != 0) { return resp; }
    announceIp = resp.responses[0].out
    var replicateCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); redis-cli -h " + announceIp + " cluster replicate " + targetMasterId;
    
    resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + slave, session, slaveEnvInfo.nodes[i].id, toJSON([{"command": replicateCommand, "params": ""}]), false, "root")
    if (resp.result != 0) { return resp; }
  }
}

return {
    result: 0
};
