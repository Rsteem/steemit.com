import sanitize from 'sanitize-html';
import Remarkable from 'remarkable';
import memoize from 'lodash/memoize';

import remarkableStripper from 'app/utils/RemarkableStripper';
import { htmlDecode } from 'app/utils/Html';
import { getTags } from 'shared/HtmlReady';

const FIELDS = [
    'author',
    'permlink',
    'parent_author',
    'parent_permlink',
    'json_metadata',
    'category',
    'title',
    'body',
    'created',
    'net_rshares',
    'children',
    'pending_payout_value',
    'depth',
];

const remarkable = new Remarkable({ html: true, linkify: false });

export default function extractContent(_data) {
    const data = extractFields(_data, FIELDS);

    data.body = data.body.trim();

    processLinks(data);
    tryExtractMetadata(data);
    tryExtractImage(data);
    data.desc = extractDescBody(data.body, data.depth);

    data.pending_payout = data.pending_payout_value;

    return data;
}

export const extractContentMemoized = memoize(extractContent);

export function extractRepost(body) {
    return extractDescBody(body.trim());
}

function extractFields(_data, list) {
    const data = {};

    if (_data.asImmutable) {
        for (let field of list) {
            data[field] = _data.get(field);
        }
    } else {
        for (let field of list) {
            data[field] = _data[field];
        }
    }

    return data;
}

function processLinks(data) {
    data.author_link = `/@${data.author}`;
    data.link = `/@${data.author}/${data.permlink}`;

    if (data.category) {
        data.link = `/${data.category}${data.link}`;
    }
}

function tryExtractMetadata(data) {
    try {
        let jsonMetadata = JSON.parse(data.json_metadata);

        if (typeof jsonMetadata == 'string') {
            // At least one case where jsonMetadata was double-encoded: #895
            jsonMetadata = JSON.parse(jsonMetadata);
        }

        data.json_metadata = jsonMetadata || {};
    } catch (err) {
        data.json_metadata = {};
    }
}

function tryExtractImage(data) {
    const meta = data.json_metadata;

    // First, attempt to find an image url in the json metadata
    if (meta) {
        if (meta.image && Array.isArray(meta.image)) {
            data.image_link = meta.image[0] || null;
        }
    }

    // If nothing found in json metadata, parse body and check images/links
    if (!data.image_link && data.body) {
        const isHtml = /^<html>([\S\s]*)<\/html>$/.test(data.body);
        const htmlText = isHtml
            ? data.body
            : remarkable.render(
                  data.body.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)')
              );

        const bodyInfo = getTags(htmlText);

        data.image_link = Array.from(bodyInfo.images)[0];

        // Was causing broken thumnails.  IPFS was not finding images uploaded to another server until a restart.
        // if(config.ipfs_prefix && data.image_link) // allow localhost nodes to see ipfs images
        //     data.image_link = data.image_link.replace(links.ipfsPrefix, config.ipfs_prefix)
    }
}

function extractDescBody(body, depth = 0) {
    if (!body) {
        return;
    }

    let desc;
    // Short description.
    // Remove bold and header, etc.
    // Stripping removes links with titles (so we got the links above)..
    // Remove block quotes if detected comment preview
    const body2 = remarkableStripper.render(
        depth > 1 ? body.replace(/>([\s\S]*?).*\s*/g, '') : body
    );

    desc = sanitize(body2, { allowedTags: [] }); // remove all html, leaving text
    desc = htmlDecode(desc);

    // Strip any raw URLs from preview text
    desc = desc.replace(/https?:\/\/[^\s]+/g, '');

    // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
    desc = desc.trim().split('\n')[0];

    if (desc.length > 140) {
        desc = desc.substring(0, 140).trim();

        const dotSpace = desc.lastIndexOf('. ');

        if (dotSpace > 80 && depth <= 1) {
            desc = desc.substring(0, dotSpace + 1);
        } else {
            // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
            desc = desc
                .substring(0, 120)
                .trim()
                .replace(/[,!\?]?\s+[^\s]+$/, '…');
        }
    }

    return desc;
}
