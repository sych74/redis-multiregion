var regions = '${settings.regions}'.split(','),
    getAnnounceIpCommand = "cat /etc/redis.conf|grep ^cluster-announce-ip|tail -n 1|awk '{print $2}'",
    targetMasterIdCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); redis-cli cluster nodes|grep myself|awk '{print $1}'",
    masterEnv = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-1', session);
    masterEnv.nodes.sort((node2, node1) => node1.id - node2.id);
    if (masterEnv.result != 0) {
        return masterEnv;
    }
for (var cluster = 2, n = regions.length + 1; cluster < n; cluster++) {
    var resp = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-' + cluster, session);
    if (resp.result != 0) {
        return resp;
    }
    resp.nodes.sort((node2, node1) => node1.id - node2.id);
    for (var i = 0, k = resp.nodes; i < ${nodes.nosqldb.length}; i++) {
        if (k[i].nodeGroup == 'nosqldb') {
            var resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + cluster, session, k[i].id, toJSON([{"command": getAnnounceIpCommand, "params": ""}]), false, "root");
            if (resp.result != 0) { return resp; }
            announceIp = resp.responses[0].out
            var meetCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); redis-cli -h 127.0.0.1 cluster meet " + announceIp + " 6379; sleep 25";
            resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-1', session, masterEnv.nodes[i].id, toJSON([{"command": meetCommand, "params": ""}]), false, "root");
            if (resp.result != 0) { return resp; }
            resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-1', session, masterEnv.nodes[i].id, toJSON([{"command": targetMasterIdCommand, "params": ""}]), false, "root");
            if (resp.result != 0) { return resp; }
            var targetMasterId = resp.responses[0].out;
            var replicateCommand = "export REDISCLI_AUTH=$(cat /etc/redis.conf |grep '^requirepass'|awk '{print $2}'); redis-cli -h " + announceIp + " cluster replicate " + targetMasterId;
            resp = jelastic.env.control.ExecCmdById('${settings.mainEnvName}-' + cluster, session, k[i].id, toJSON([{"command": replicateCommand, "params": ""}]), false, "root")
            if (resp.result != 0) { return resp; }
        }
    }
}
return {
    result: 0
};
