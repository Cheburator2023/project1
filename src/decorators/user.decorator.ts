import { createParamDecorator } from "@nestjs/common";

export const User = createParamDecorator((data, req) => {
  return {
    name: req.user.preferred_username,
    username: req.user.preferred_username,
    email: req.user.email,
    keycloakGroups: req.user.groups,
    family_name: req.user.family_name || '',
    given_name: req.user.given_name || '',
    preferred_username: req.user.preferred_username,
    groups: req.user.groups
      .reduce((prev, group) => {
        const newGroup = group.split('/');
        prev.push(...newGroup);
        return prev;
      }, [])
      .filter((d) => d)
      .filter((d, i, a) => a.indexOf(d) === i && d),
    roles: req.user.roles || [],
  };
});
