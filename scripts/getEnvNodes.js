var regions = '${settings.regions}'.split(','),
    onAfterReturn = {
        setGlobals: {}
    },
    glbs = onAfterReturn.setGlobals,
    redisEnvs = [];
for (var cluster = 1, n = regions.length + 1; cluster < n; cluster++) {
    var resp = jelastic.env.control.GetEnvInfo('${settings.mainEnvName}-' + cluster, session);
    if (resp.result != 0) {
        return resp;
    } else {
        redisEnvs.push(resp.env.shortdomain);
    }
}
glbs["redisEnvs"] = redisEnvs;
return {
    result: 0,
    onAfterReturn: onAfterReturn
};
