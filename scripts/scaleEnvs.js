var regions = '${settings.regions}'.split(','),
    masterEnv = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-1', session);
    if (masterEnv.result != 0) {
        return masterEnv;
    }
var nodesCount = masterEnv.nodes.length;

for (var cluster = 2, n = regions.length + 1; cluster < n; cluster++) {
    var resp = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-' + cluster, session);
    if (resp.result != 0) {
        return resp;
    }
    var env = resp.env;
    var nodeType = resp.nodes[0].nodeType;
    var nodeGroup = resp.nodes[0].nodeGroup;
    var count = nodesCount;
    var tag = resp.nodes[0].dockerTag;
    var fixedCloudlets = resp.nodes[0].fixedCloudlets;
    var flexibleCloudlets = resp.nodes[0].flexibleCloudlets;
    var nodes = {};
    nodes.nodeType = nodeType;
    nodes.nodeGroup = nodeGroup;
    nodes.count = count;
    nodes.restartDelay = 0;
    nodes.tag = tag;
    nodes.fixedCloudlets = fixedCloudlets;
    nodes.flexibleCloudlets = flexibleCloudlets;
    resp = jelastic.env.control.ChangeTopology('${settings.mainEnvName}-' + cluster, session, null, env, nodes);
    if (resp.result != 0) {
        return resp;
    }
}

return {
    result: 0
};
