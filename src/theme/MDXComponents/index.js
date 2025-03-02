/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 import React from 'react';
 import CodeBlock from '@theme/CodeBlock';
 import Heading from '@theme/Heading';
 import Tabs from '@theme/Tabs';
 import TabItem from '@theme/TabItem';
 import styles from './styles.module.css';

 /*
  * Taken from docs.getdbt.com to make metriql documentation more user-friendly to dbt users:
  */
 import Changelog from '@site/src/components/changelog';
 import Collapsible from '@site/src/components/collapsible';
 import File from '@site/src/components/file';
 import Lightbox from '@site/src/components/lightbox';
 import Link from '@site/src/components/link';
 import LoomVideo from '@site/src/components/loom';
 import YoutubeVideo from '@site/src/components/youtube';
 
 export default {
   code: props => {
     const {children} = props;
     if (typeof children === 'string') {
       return <CodeBlock {...props} />;
     }
     return children;
   },
   a: (props) => <Link {...props} />,
   pre: props => <pre className={styles.mdxCodeBlock} {...props} />,
   h1: Heading('h1'),
   h2: Heading('h2'),
   h3: Heading('h3'),
   h4: Heading('h4'),
   h5: Heading('h5'),
   h6: Heading('h6'),
 
   Changelog: Changelog,
   Collapsible: Collapsible,
   File: File,
   Lightbox: Lightbox,
   Link: Link,
   LoomVideo: LoomVideo,
   Tabs: Tabs,
   TabItem: TabItem,
   YoutubeVideo: YoutubeVideo,
 };