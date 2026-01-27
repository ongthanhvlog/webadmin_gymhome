import component from './vn-VN/component';
import globalHeader from './vn-VN/globalHeader';
import menu from './vn-VN/menu';
import pages from './vn-VN/pages';
import pwa from './vn-VN/pwa';
import settingDrawer from './vn-VN/settingDrawer';
import settings from './vn-VN/settings';

export default {
  'navBar.lang': 'Languages',
  'layout.user.link.help': 'Help',
  'layout.user.link.privacy': 'Privacy',
  'layout.user.link.terms': 'Terms',
  'app.preview.down.block': 'Download this page to your local project',
  'app.welcome.link.fetch-blocks': 'Get all block',
  'app.welcome.link.block-list':
    'Quickly build standard, pages based on `block` development',
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
  ...pages,
};
