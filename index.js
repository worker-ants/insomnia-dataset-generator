require('dotenv').config();
const { env } = require('./env');
const md5 = require('crypto-js/md5');
const { resolve, basename, relative } = require('path');
const { readdir, readFile, writeFile } = require('fs').promises;

class Generate {
    static ID_PREFIX = {
        WORKSPACE: 'wrk',
        ENVIRONMENT: 'env',
        PAIR: 'pair',
        REQUEST_GROUP: 'fld',
        REQUEST: 'req',
    };

    template = {
        root: undefined,
        workspace: undefined,
        environmentBase: undefined,
        environmentItem: undefined,
        apiSpec: undefined,
        requestGroup: undefined,
        request: undefined,
    };

    timestamp = this.getTimeStamp();
    staticId = {
        WORKSPACE_ID: env.WORKSPACE_ID,
        REQUEST_CREDENTIAL: this.getId(Generate.ID_PREFIX.REQUEST, 'REQUEST_CREDENTIAL'),
        HEADER_CONTENT_TYPE: this.getId(Generate.ID_PREFIX.PAIR, 'HEADER_CONTENT_TYPE'),
    };

    /**
     * result dataset
     * @type {[]}
     */
    resources = [];

    stats = {
        environment: 0,
        requestGroup: 0,
        request: 0,
    };

    async main() {
        await this.loadTemplate();

        // workspace
        const workspaceId = this.setWorkspace(env.WORKSPACE_NAME, env.WORKSPACE_DESCRIPTION);

        // environment space
        const baseEnvironmentId = this.setEnvironmentBase(workspaceId);

        // environments
        env.ENVIRONMENT.map((item) => {
            return {
                id: this.setEnvironmentItem(baseEnvironmentId, item),
                data: item,
            }
        });

        // apiSpec
        this.setApiSpec(workspaceId);

        // request group & request
        await this.recursive(env.RESOURCE_PATH, workspaceId);

        // write generated data
        const root = this.getTemplate(this.template.root, {EXPORT_DATE: this.getISOTime()});
        const resources = this.resources.join("\n").replace(/^/mg, ''.padStart(env.INDENT, ' '));

        return `${root}\n${resources}`;
    }

    async loadTemplate() {
        this.template = {
            root: await readFile('templates/root.yaml', 'utf-8'),
            workspace: await readFile('templates/workspace.yaml', 'utf-8'),
            environmentBase: await readFile('templates/EnvironmentBase.yaml', 'utf-8'),
            environmentItem: await readFile('templates/EnvironmentItem.yaml', 'utf-8'),
            apiSpec: await readFile('templates/apiSpec.yaml', 'utf-8'),
            requestGroup: await readFile('templates/requestGroup.yaml', 'utf-8'),
            request: await readFile('templates/request.yaml', 'utf-8'),
        };
    }

    setWorkspace(name, description) {
        const id = this.getId(Generate.ID_PREFIX.WORKSPACE, this.staticId.WORKSPACE_ID);
        const template = this.getTemplate(this.template.workspace, this.getTemplateParams(id, null, name, description));
        this.resources.push(template);

        return id;
    }

    setEnvironmentBase(pid) {
        const id = this.getId(Generate.ID_PREFIX.WORKSPACE, 'EnvironmentBase');
        const template = this.getTemplate(this.template.environmentBase,
            this.getTemplateParams(id, pid, null, null)
        );
        this.resources.push(template);

        return id;
    }

    setEnvironmentItem(pid, params) {
        const id = this.getId(Generate.ID_PREFIX.ENVIRONMENT, params.NAME);

        const template = this.getTemplate(this.template.environmentItem,
            this.getTemplateParams(id, pid, params.NAME, null, {
                GQL_HOST: params.GQL_HOST ?? '',
                HT_USER_ID: params.HT_USER_ID ?? '',
                HT_USER_PASSWORD: params.HT_USER_PASSWORD ?? '',
                CREDENTIAL_REQUEST_ID: this.staticId.REQUEST_CREDENTIAL,
            })
        );
        this.resources.push(template);
        this.stats.environment++;

        return id;
    }

    setApiSpec(pid) {
        const id = this.getId(Generate.ID_PREFIX.WORKSPACE, 'apiSpec');
        const template = this.getTemplate(this.template.apiSpec,
            this.getTemplateParams(id, pid, null, null, {
                FILE_NAME: env.WORKSPACE_NAME,
            })
        );
        this.resources.push(template);

        return id;
    }

    setRequestGroup(pid, path) {
        const id = this.getId(Generate.ID_PREFIX.REQUEST_GROUP, relative(__dirname, path));
        const name = basename(path);
        const template = this.getTemplate(this.template.requestGroup, this.getTemplateParams(id, pid, name, null));

        this.resources.push(template);
        this.stats.requestGroup++;

        return id;
    }

    setRequest(pid, apiData) {
        const id = this.staticId[apiData.type] ?? this.getId(Generate.ID_PREFIX.REQUEST, pid);
        const description = apiData.description
            .replace(/^/mg, ''.padStart(env.INDENT * 2, ' '))
            .replace(/^[\s]+/, "")
            .replace(/^#[\s\t]+(.+)$/m, "");
        const template = this.getTemplate(this.template.request,
            this.getTemplateParams(id, pid, apiData.title, description, {
                QUERY_DATA: JSON.stringify({
                    query: apiData.query,
                    variables: JSON.parse(apiData.variables),
                }),
                HEADER_CONTENT_TYPE_ID: this.staticId.HEADER_CONTENT_TYPE,
            })
        );

        this.resources.push(template);
        this.stats.request++;

        return id;
    }

    getTemplateParams(id, pid, name, description, extendParams) {
        const base = {
            ID: id,
            PARENT_ID: pid,
            NAME: name,
            DESCRIPTION: description,
            CREATED_AT: this.timestamp,
            MODIFIED_AT: this.timestamp,
            SORT_ID: this.getSortId(),
        }

        return Object.assign(base, extendParams ?? {});
    }

    getTemplate(template, params) {
        const pattern = /\$[{]([A-Z0-9-_]+)[}]/g;
        return template.replace(pattern, (part) => {
            const key = part.replace(pattern, "$1");

            if (!params.hasOwnProperty(key)) {
                const line = ''.padStart(50, '-');
                throw new Error(`'${line}\n${key}' not found\n${line}\n${template}\n${line}`);
            }

            return params[key] ?? '';
        });
    }

    getSortId() {
        return 0;
    }

    async recursive(path, pid) {
        const data = await this.getPathInfo(path);
        const id = this.setRequestGroup(pid, path);

        // do dir
        await Promise.allSettled(
            data.dir.map(async (item) => {
                const subPath = resolve(data.parent, item);
                await this.recursive(subPath, pid);
            })
        );

        // do file
        await Promise.allSettled(
            data.file.map(async (item) => {
                const filePath = resolve(data.parent, item);
                const apiData = await this.getApiData(filePath)
                    .catch((e) => {
                        console.log(filePath, e);
                    });

                this.setRequest(id, apiData);
            })
        );
    }

    async getApiData(sourcePath) {
        const contents = await readFile(sourcePath, "utf-8");
        return {
            title: (() => {
                const title = contents.match(/^#[\s\t]+(.+)$/m);
                return title ? title[1] : null;
            })(),
            description: contents,
            type: (() => {
                const type = contents.match(/##[\s\t]*Type[\s\t\r\n]+```[^\n]*\n(.+)\n```/ims);
                return type ? type[1]?.replace(/\n```.+$/ms, "") : null;
            })(),
            query: (() => {
                const query = contents.match(/##[\s\t]*Query[\s\t\r\n]+```[^\n]*\n(.+)\n```/ims);
                return query ? query[1]?.replace(/\n```.+$/ms, "") : null;
            })(),
            variables: (() => {
                const variable = contents.match(/##[\s\t]*Variables[\s\t\r\n]+```[^\n]*\n(.+)\n```/ims);
                return variable ? variable[1]?.replace(/\n```.+$/ms, "") : null;
            })(),
        };
    }

    getISOTime() {
        return new Date().toISOString();
    }

    getTimeStamp() {
        return new Date().getTime();
    }

    /**
     *
     * @param type wrk:workspace / spc: apiSpec / fld: dir / env: environment / req: API request
     * @param factor
     * @returns {string}
     */
    getId(type, factor) {
        const seed = md5(factor).toString();
        return `${type}_${seed}`;
    }

    async getPathInfo(dir) {
        const dirPaths = await readdir(dir, { withFileTypes: true });
        const dirs = [];
        const files = [];
        await Promise.all(dirPaths.map((dirent) => {
            if (dirent.isDirectory()) {
                dirs.push(dirent.name);
            } else {
                files.push(dirent.name);
            }
        }));

        return {
            parent: resolve(dir),
            dir: dirs,
            file: files,
        }
    }
}

const blankLine = ''.padStart(50, '-');
(async () => {
    console.log(blankLine);
    console.log(`generate start`);

    const generate = new Generate();
    const contents = await generate.main();

    console.log('generate complete');
    console.log(blankLine);

    console.log('generate item count');
    for (let statsKey in generate.stats) {
        console.log(`${statsKey}: ${generate.stats[statsKey]}`);
    }

    console.log(blankLine);
    await writeFile(`result/${env.WORKSPACE_NAME}.yaml`, contents, {encoding: "utf-8"});
    console.log('save complete');
    console.log(blankLine);
})().catch((e) => {
    console.error(e);
    console.log(blankLine);
});