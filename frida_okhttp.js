function findOkHttpClient() {
    var classes = Java.enumerateLoadedClassesSync();


    for (let i = 0; i < classes.length; i++) {
        const e = classes[i];
        if (e.split(".").length == 2) {
            var temp = Java.use(e).class
            var fields = temp.getDeclaredFields().toString()
            var interface1 = temp.getInterfaces().toString()
            if (interface1.indexOf("java.lang.Cloneable") != -1) {
                if (fields.indexOf("java.net.ProxySelector") != -1 && fields.indexOf("Socket") != -1) {
                    return e;
                }
            }
        }
    }
    return undefined;
}

var interceptors = []

function findInterceptor(client) {
    var temp = Java.use(client).class
    var listtype
    var fields = temp.getDeclaredFields()
    for (let i = 0; i < fields.length; i++) {
        const e = fields[i];
        var type = e.getGenericType().getTypeName()
        if (type.indexOf("java.util.List") != -1) {
            var a = /java.util.List<(.*)>/.exec(type)[1]
            if (Java.use(a).class.isInterface()) {
                interceptors.push(e)
                listtype = a
            }
        }
    }
    return listtype;
}

function main() {

    Java.perform(function () {
        const Client = findOkHttpClient()
        if (Client==undefined) {
            console.log("未找到OkHttpClient");
            return
        }
        const Interceptor = findInterceptor(Client)
        var intercept = Java.use(Interceptor).class.getDeclaredMethods()[0]
        const Response = intercept.getReturnType().getName()
        const Chain = intercept.getParameterTypes()[0].getName()
        var request_chain, process_chain;

        var Request;
        var chainMethods = Java.use(Chain).class.getDeclaredMethods()
        for (let i = 0; i < chainMethods.length; i++) {

            const element = chainMethods[i];

            Request = /public abstract .*\((.+)\)/.exec(element)
            if (Request != undefined) {
                Request = Request[1]
                break
            }

        }
        for (let i = 0; i < chainMethods.length; i++) {
            const element = chainMethods[i];
            if (element.getReturnType().getName() == Request) {
                request_chain = element.getName()
            }
            if (element.getReturnType().getName() == Response) {
                process_chain = element.getName()
            }
        }
        console.log("interceptor", Interceptor);
        console.log("response", Response);
        console.log("chain", Chain);
        console.log("client", Client);
        console.log("request", Request);
        var imple = {}
        imple[intercept.getName()] = function (chain) {
            var request = chain[request_chain]();
            var res = chain[process_chain](request)
            console.log("请求:",request);
            console.log("响应:",res);
            return res;
        }
        var http = Java.registerClass({
            name: "okhttp3.MyInterceptor",
            implements: [Java.use(Interceptor)],
            methods: imple
        })
        var ArrayList = Java.use("java.util.ArrayList")
        Java.choose(Client, {
            onMatch(i) {
                interceptors.forEach(e => {
                    e.setAccessible(true);
                    var list = Java.cast(e.get(i), Java.use("java.util.List"))
                    var arr = ArrayList.$new()
                    for (let i = 0; i < list.size(); i++) {
                        const element = list.get(i);
                        if (element.toString().indexOf("okhttp3.MyInterceptor") == -1) {
                            arr.add(element)
                        }
                    }
                    arr.add(http.$new())
                    e.set(i, arr);
                })


            }
        })

    })

}