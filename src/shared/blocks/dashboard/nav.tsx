'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

import { Link, usePathname, useRouter } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/shared/components/ui/sidebar';
import { resolveLocalizedRoute } from '@/shared/lib/routes';
import { NavItem, type Nav as NavType } from '@/shared/types/blocks/common';

export function Nav({ nav, className }: { nav: NavType; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getItemUrl = (item?: NavItem) => {
    if (!item) return '';
    if (item.url_key) {
      const resolved = resolveLocalizedRoute(item.url_key, locale);
      return resolved || item.url || '';
    }
    return item.url || '';
  };

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent className="mt-0 flex flex-col gap-2">
        {nav.title && <SidebarGroupLabel>{nav.title}</SidebarGroupLabel>}
        <SidebarMenu>
          {nav.items.map((item: NavItem | undefined) => {
            const itemUrl = getItemUrl(item);
            return (
            <Collapsible
              key={item?.title || item?.title || ''}
              asChild
              defaultOpen={item?.is_expand || false}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {item?.children ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item?.title}
                      className={`${
                        item?.is_active ||
                        (mounted &&
                          itemUrl &&
                          pathname.startsWith(itemUrl))
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/90 active:text-sidebar-accent-foreground min-w-8 duration-200 ease-linear'
                          : ''
                      }`}
                    >
                      {item?.icon && <SmartIcon name={item.icon as string} />}
                      <span>{item?.title || ''}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton
                    asChild
                    tooltip={item?.title}
                    className={`${
                      item?.is_active ||
                      (mounted &&
                        itemUrl &&
                        pathname.startsWith(itemUrl))
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/90 active:text-sidebar-accent-foreground min-w-8 duration-200 ease-linear'
                        : ''
                    }`}
                  >
                    <Link
                      href={itemUrl}
                      target={item?.target as string}
                    >
                      {item?.icon && <SmartIcon name={item.icon as string} />}
                      <span>{item?.title || ''}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
                {item?.children && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children?.map((subItem: NavItem) => {
                        const subItemUrl = getItemUrl(subItem);
                        return (
                          <SidebarMenuSubItem
                            key={subItem.title || subItem.title}
                          >
                          <SidebarMenuSubButton
                            asChild
                            className={`${
                              subItem.is_active ||
                              (mounted &&
                                subItemUrl &&
                                pathname.endsWith(subItemUrl))
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/90 active:text-sidebar-accent-foreground min-w-8 duration-200 ease-linear'
                                : ''
                            }`}
                          >
                            <Link
                              href={subItemUrl}
                              target={subItem.target as string}
                            >
                              {/* {subItem.icon && (
                                <SmartIcon name={subItem.icon as string} />
                              )} */}
                              <span className="px-2">{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
