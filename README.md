## Catalog REST server - Getting Started

First, cd into the catalog-rest-server folder with a terminal client and install the necessary dependencies. This downloads any dependencies which are put into the node_module folder. This folder is ignored by svn, so these files will not and don't have to be committed. 

```
cd <drive>:<workspace>\Service catalog\src\nodejs\catalog-rest-server <enter>
npm install <enter>
```

To start development, install the latest visual studio code, do the above and type

```
code . <enter>
open server.ts (for example)
press ctrl - ~ to open a terminal and type
npm run dev <enter>
```


To just run the server:

```
npm run server <enter>
```

